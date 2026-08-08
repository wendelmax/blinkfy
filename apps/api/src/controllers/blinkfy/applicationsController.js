const { computeFitScore } = require('../../services/blinkfy/fitScoreService');
const { recordAuditEvent } = require('../../services/blinkfy/auditService');

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
                metadata: { score: computed.score, confidence: computed.confidence },
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

    return { recomputeScore, updateStage, overrideScore };
}

module.exports = { createApplicationsController, allowedTransitions, serializeApplication };
