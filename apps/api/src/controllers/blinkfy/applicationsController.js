const { computeFitScore } = require('../../services/blinkfy/fitScoreService');
const { recordAuditEvent } = require('../../services/blinkfy/auditService');
const { transitionScreeningSession } = require('../../services/blinkfy/screeningSessionService');
const { validateEvidenceInput, findLatestDossierSession } = require('../../services/blinkfy/screeningDossierService');
const { summarizeScreening } = require('../../services/blinkfy/screeningSummaryService');
const { validateRecruiterFeedback } = require('../../services/blinkfy/conciergeFeedbackService');
const { findExpiredEvidence } = require('../../services/blinkfy/screeningRetentionService');

const allowedTransitions = {
    mapped: ['reviewed'],
    reviewed: ['interested'],
    interested: ['screened'],
    screened: ['shortlisted'],
};

const timestampFieldByStage = {
    reviewed: 'reviewedAt',
    interested: 'interestedAt',
    screened: 'screenedAt',
    shortlisted: 'shortlistedAt',
    rejected: 'rejectedAt',
};

function serializeScore(snapshot) {
    if (!snapshot) {
        return null;
    }
    return {
        id: snapshot.id,
        score: snapshot.score,
        confidence: snapshot.confidence,
        policyVersion: snapshot.policyVersion,
        factors: snapshot.factors,
        gaps: snapshot.gaps,
        computedAt: snapshot.computedAt,
        overrideScore: snapshot.overrideScore,
        overrideReason: snapshot.overrideReason,
        overrideByUserId: snapshot.overrideByUserId,
        overriddenAt: snapshot.overriddenAt,
    };
}

function serializeApplication(application) {
    const snapshot = application.scoreSnapshots?.[0] || application.scoreSnapshot;
    const candidateProfile = application.candidate?.profile || {};
    return {
        id: application.id,
        candidateId: application.candidateId,
        clientId: application.clientId,
        jobId: application.jobId,
        stage: application.stage,
        mappedAt: application.mappedAt,
        reviewedAt: application.reviewedAt,
        interestedAt: application.interestedAt,
        screenedAt: application.screenedAt,
        shortlistedAt: application.shortlistedAt,
        rejectedAt: application.rejectedAt,
        score: serializeScore(snapshot),
        ...(application.candidate ? {
            fullName: application.candidate.fullName,
            currentTitle: candidateProfile.currentTitle || null,
            consentRecorded: application.candidate.consents?.some((consent) => consent.purpose === 'client_presentation'
                && consent.revokedAt === null
                && (consent.clientId === null || consent.clientId === application.clientId)) ?? false,
        } : {}),
    };
}

async function findApplication({ prisma, workspaceId, jobId, applicationId }) {
    return prisma.candidateApplication.findFirst({
        where: {
            id: applicationId,
            jobId,
            job: { client: { workspaceId } },
            candidate: { workspaceId },
        },
        include: {
            candidate: true,
            job: { include: { scorecard: true } },
            scoreSnapshots: { orderBy: { computedAt: 'desc' }, take: 1 },
        },
    });
}

function parseScoreOverride(body) {
    const score = body?.score;
    const reason = body?.reason;
    if (!Number.isInteger(score) || score < 0 || score > 100 || typeof reason !== 'string' || reason.trim() === '') {
        return null;
    }
    return { score, reason: reason.trim() };
}

function createApplicationsController({ prisma }) {
    async function getScreeningApplication(req) {
        return prisma.candidateApplication.findFirst({
            where: { id: req.params.applicationId, jobId: req.params.jobId, candidate: { workspaceId: req.workspace.id }, job: { client: { workspaceId: req.workspace.id } } },
        });
    }

    async function screeningAction(req, res, action) {
        const application = await getScreeningApplication(req);
        if (!application) return res.status(404).json({ message: 'Application not found' });
        const existing = await prisma.screeningSession.findFirst({ where: { applicationId: application.id }, orderBy: { createdAt: 'desc' } });
        if (action === 'invite') {
            if (existing && existing.status !== 'withdrawn') return res.status(200).json({ session: existing });
            const session = await prisma.screeningSession.create({ data: { applicationId: application.id } });
            await recordAuditEvent({ prisma, workspaceId: req.workspace.id, clientId: application.clientId, actorUserId: req.user.id, entityType: 'screening_session', entityId: session.id, action: 'screening.invited', metadata: {} });
            return res.status(201).json({ session });
        }
        if (!existing) return res.status(404).json({ message: 'Screening session not found' });
        let nextStatus;
        let data = {};
        if (action === 'consent') { nextStatus = 'consented'; data = { consentedAt: new Date(), consentVersion: req.body?.consentVersion || 'v1' }; }
        if (action === 'schedule') { nextStatus = 'scheduled'; data = { scheduledAt: new Date(req.body?.scheduledAt || Date.now()) }; }
        if (action === 'start') { nextStatus = 'in_progress'; data = { startedAt: new Date() }; }
        if (action === 'complete') {
            const evidence = await prisma.screeningEvidence.findMany({ where: { sessionId: existing.id, kind: { in: ['transcript', 'insight'] } }, select: { kind: true } });
            const kinds = new Set(evidence.map((item) => item.kind));
            if (!kinds.has('transcript') || !kinds.has('insight')) return res.status(422).json({ message: 'Transcript and insight evidence are required before completing screening' });
            nextStatus = 'completed'; data = { completedAt: new Date() };
        }
        if (action === 'withdraw') { nextStatus = 'withdrawn'; data = { withdrawnAt: new Date() }; }
        try { transitionScreeningSession(existing, nextStatus); } catch (error) { return res.status(422).json({ message: error.message }); }
        const session = await prisma.screeningSession.update({ where: { id: existing.id }, data: { ...data, status: nextStatus } });
        await recordAuditEvent({ prisma, workspaceId: req.workspace.id, clientId: application.clientId, actorUserId: req.user.id, entityType: 'screening_session', entityId: session.id, action: `screening.${action}`, metadata: { status: nextStatus } });
        return res.json({ session });
    }

    const inviteScreening = (req, res) => screeningAction(req, res, 'invite');
    const consentScreening = (req, res) => screeningAction(req, res, 'consent');
    const scheduleScreening = (req, res) => screeningAction(req, res, 'schedule');
    const startScreening = (req, res) => screeningAction(req, res, 'start');
    const completeScreening = (req, res) => screeningAction(req, res, 'complete');
    const withdrawScreening = (req, res) => screeningAction(req, res, 'withdraw');
    async function addScreeningEvidence(req, res) {
        const application = await findApplication({ prisma, workspaceId: req.workspace.id, jobId: req.params.jobId, applicationId: req.params.applicationId });
        if (!application) return res.status(404).json({ message: 'Application not found' });
        let input;
        try { input = validateEvidenceInput(req.body); } catch (error) { return res.status(422).json({ message: error.message }); }
        const session = await prisma.screeningSession.findFirst({ where: { applicationId: application.id }, orderBy: { createdAt: 'desc' } });
        if (!session || session.status === 'withdrawn') return res.status(404).json({ message: 'Eligible screening session not found' });
        if (!session.consentedAt || !['consented', 'scheduled', 'in_progress', 'completed'].includes(session.status)) return res.status(403).json({ message: 'Screening consent required' });
        const evidence = await prisma.$transaction(async (transaction) => {
            const locked = await transaction.screeningSession.findUnique({ where: { id: session.id } });
            if (!locked?.consentedAt || locked.status === 'withdrawn') throw new Error('Screening consent required');
            const created = await transaction.screeningEvidence.create({ data: { sessionId: locked.id, ...input } });
            await recordAuditEvent({ prisma: transaction, workspaceId: req.workspace.id, clientId: application.clientId, actorUserId: req.user.id, entityType: 'screening_evidence', entityId: created.id, action: 'screening.evidence_added', metadata: { sessionId: locked.id, kind: created.kind } });
            return created;
        });
        return res.status(201).json({ evidence });
    }
    async function getScreeningDossier(req, res) {
        const application = await findApplication({ prisma, workspaceId: req.workspace.id, jobId: req.params.jobId, applicationId: req.params.applicationId });
        if (!application) return res.status(404).json({ message: 'Application not found' });
        const session = await findLatestDossierSession({ prisma, applicationId: application.id });
        if (!session) return res.status(404).json({ message: 'Screening dossier not found' });
        if (!session.consentedAt) return res.status(403).json({ message: 'Screening consent required' });
        const score = application.scoreSnapshots?.[0] || null;
        const expiredEvidenceIds = findExpiredEvidence(session.evidences);
        return res.json({ application: serializeApplication(application), session: { id: session.id, status: session.status, consentedAt: session.consentedAt, consentVersion: session.consentVersion, scheduledAt: session.scheduledAt, startedAt: session.startedAt, completedAt: session.completedAt }, evidences: session.evidences, retention: { expiredEvidenceIds, expiringCount: session.evidences.filter((evidence) => evidence.retentionUntil && !expiredEvidenceIds.includes(evidence.id)).length }, score: serializeScore(score), summary: summarizeScreening({ session, evidences: session.evidences, score }) });
    }
    async function listScreeningFeedback(req, res) {
        const application = await getScreeningApplication(req);
        if (!application) return res.status(404).json({ message: 'Application not found' });
        const items = await prisma.screeningFeedback.findMany({ where: { applicationId: application.id }, orderBy: { createdAt: 'desc' } });
        return res.json({ items });
    }
    async function listConciergeMessages(req, res) {
        const application = await getScreeningApplication(req);
        if (!application) return res.status(404).json({ message: 'Application not found' });
        const items = await prisma.conciergeMessage.findMany({ where: { applicationId: application.id }, orderBy: { receivedAt: 'desc' } });
        return res.json({ items });
    }
    async function createScreeningFeedback(req, res) {
        const application = await getScreeningApplication(req);
        if (!application) return res.status(404).json({ message: 'Application not found' });
        const session = await prisma.screeningSession.findFirst({ where: { applicationId: application.id }, orderBy: { createdAt: 'desc' } });
        if (!session?.consentedAt) return res.status(403).json({ message: 'Screening consent required' });
        let input;
        try { input = validateRecruiterFeedback(req.body); } catch (error) { return res.status(422).json({ message: error.message }); }
        const feedback = await prisma.$transaction(async (transaction) => {
            const created = await transaction.screeningFeedback.create({ data: { applicationId: application.id, reviewerId: req.user.id, ...input } });
            await recordAuditEvent({ prisma: transaction, workspaceId: req.workspace.id, clientId: application.clientId, actorUserId: req.user.id, entityType: 'screening_feedback', entityId: created.id, action: 'screening.feedback_created', metadata: { status: created.status, requiresHumanReview: created.status === 'needs_review' } });
            return created;
        });
        return res.status(201).json({ feedback });
    }
    async function listApplications(req, res) {
        const job = await prisma.blinkfyJob.findFirst({
            where: { id: req.params.jobId, client: { workspaceId: req.workspace.id } },
        });
        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }
        const applications = await prisma.candidateApplication.findMany({
            where: { jobId: job.id, candidate: { workspaceId: req.workspace.id } },
            include: {
                candidate: {
                    include: {
                        consents: {
                            where: { workspaceId: req.workspace.id, purpose: 'client_presentation', revokedAt: null },
                        },
                    },
                },
                scoreSnapshots: { orderBy: { computedAt: 'desc' }, take: 1 },
            },
            orderBy: { mappedAt: 'desc' },
        });
        return res.json({ items: applications.map(serializeApplication) });
    }

    async function recomputeScore(req, res) {
        const application = await findApplication({ prisma, workspaceId: req.workspace.id, jobId: req.params.jobId, applicationId: req.params.applicationId });
        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }
        const computed = computeFitScore({ job: application.job, candidate: application.candidate });
        const snapshot = await prisma.$transaction(async (transaction) => {
            const created = await transaction.fitScoreSnapshot.create({
                data: { applicationId: application.id, ...computed },
            });
            await recordAuditEvent({
                prisma: transaction, workspaceId: req.workspace.id, clientId: application.clientId, actorUserId: req.user.id,
                entityType: 'candidate_application', entityId: application.id, action: 'application.score_recomputed',
                metadata: { score: computed.score, confidence: computed.confidence, policyVersion: computed.policyVersion },
            });
            return created;
        });
        return res.status(200).json({ application: serializeApplication({ ...application, scoreSnapshot: snapshot }), score: serializeScore(snapshot) });
    }

    async function updateStage(req, res) {
        const application = await findApplication({ prisma, workspaceId: req.workspace.id, jobId: req.params.jobId, applicationId: req.params.applicationId });
        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }
        const nextStage = req.body?.stage;
        const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
        const isRejection = nextStage === 'rejected';
        const validTransition = isRejection
            ? ['mapped', 'reviewed', 'interested', 'screened'].includes(application.stage) && reason !== ''
            : allowedTransitions[application.stage]?.includes(nextStage);
        if (!validTransition) {
            return res.status(422).json({ message: isRejection ? 'A human reviewer reason is required for rejection' : 'Invalid reviewed pipeline transition' });
        }
        const updated = await prisma.$transaction(async (transaction) => {
            const timestampField = timestampFieldByStage[nextStage];
            const changed = await transaction.candidateApplication.update({
                where: { id: application.id },
                data: { stage: nextStage, [timestampField]: new Date() },
                include: { scoreSnapshots: { orderBy: { computedAt: 'desc' }, take: 1 } },
            });
            await recordAuditEvent({
                prisma: transaction, workspaceId: req.workspace.id, clientId: application.clientId, actorUserId: req.user.id,
                entityType: 'candidate_application', entityId: application.id,
                action: isRejection ? 'application.rejected' : 'application.stage_changed',
                metadata: { from: application.stage, to: nextStage, ...(isRejection ? { reason } : {}) },
            });
            return changed;
        });
        return res.json({ application: serializeApplication(updated) });
    }

    async function overrideScore(req, res) {
        const override = parseScoreOverride(req.body);
        if (!override) {
            return res.status(422).json({ message: 'score (0..100 integer) and reviewer reason are required' });
        }
        const application = await findApplication({ prisma, workspaceId: req.workspace.id, jobId: req.params.jobId, applicationId: req.params.applicationId });
        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }
        const snapshot = await prisma.$transaction(async (transaction) => {
            const current = application.scoreSnapshots[0] || await transaction.fitScoreSnapshot.create({
                data: { applicationId: application.id, ...computeFitScore({ job: application.job, candidate: application.candidate }) },
            });
            const updated = await transaction.fitScoreSnapshot.update({
                where: { id: current.id },
                data: { overrideScore: override.score, overrideReason: override.reason, overrideByUserId: req.user.id, overriddenAt: new Date() },
            });
            await recordAuditEvent({
                prisma: transaction, workspaceId: req.workspace.id, clientId: application.clientId, actorUserId: req.user.id,
                entityType: 'candidate_application', entityId: application.id, action: 'application.score_overridden',
                metadata: { overrideScore: override.score, reason: override.reason },
            });
            return updated;
        });
        return res.json({ application: serializeApplication({ ...application, scoreSnapshot: snapshot }), score: serializeScore(snapshot) });
    }

    return { listApplications, recomputeScore, updateStage, overrideScore, inviteScreening, consentScreening, scheduleScreening, startScreening, completeScreening, withdrawScreening, addScreeningEvidence, getScreeningDossier, listScreeningFeedback, createScreeningFeedback, listConciergeMessages };
}

module.exports = { createApplicationsController, allowedTransitions, serializeApplication };
