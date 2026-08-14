const {
    getCandidateProfile,
    updateCandidateProfile,
    setCandidateVisibility,
} = require('../../services/blinkfy/talentProfileService');
const { recordAuditEvent } = require('../../services/blinkfy/auditService');
const { getCandidatePositioningAnalytics } = require('../../services/blinkfy/talentPositioningService');
const { buildResumeDraft } = require('../../services/blinkfy/talentResumeDraftService');
const { buildEngagementDraft } = require('../../services/blinkfy/talentEngagementDraftService');
const { transitionScreeningSession } = require('../../services/blinkfy/screeningSessionService');
const { recommendConnections } = require('../../services/blinkfy/networkInsightsService');
const { buildTalentUsageAnalytics } = require('../../services/blinkfy/talentUsageAnalyticsService');
const { consumeUsage } = require('../../services/blinkfy/talentUsageService');
const { usageFeatureForDraft, periodKey } = require('../../services/blinkfy/talentDraftUsageService');
const { transitionCandidateDraft } = require('../../services/blinkfy/talentDraftReviewService');
const { buildTalentPlanCatalog } = require('../../services/blinkfy/talentPlanCatalogService');
const { buildUpgradeIntent } = require('../../services/blinkfy/talentUpgradeService');

function createTalentController({ prisma }) {
    async function resolveCandidate(req) {
        return prisma.candidate.findFirst({
            where: { workspaceId: req.workspace.id, userId: req.user.id },
        });
    }

    async function getProfile(req, res) {
        const profile = await getCandidateProfile({ prisma, workspaceId: req.workspace.id, userId: req.user.id });
        if (!profile) return res.status(404).json({ message: 'Candidate profile not found' });
        return res.json(profile);
    }

    async function getPositioningAnalytics(req, res) {
        const analytics = await getCandidatePositioningAnalytics({
            prisma, workspaceId: req.workspace.id, userId: req.user.id,
        });
        if (!analytics) return res.status(404).json({ message: 'Candidate profile not found' });
        return res.json(analytics);
    }

    async function listNetworkRecommendations(req, res) {
        const candidate = await resolveCandidate(req);
        if (!candidate) return res.status(404).json({ message: 'Candidate profile not found' });
        const profile = candidate.profile && typeof candidate.profile === 'object' ? candidate.profile : {};
        const connections = Array.isArray(profile.connections) ? profile.connections : [];
        return res.json({ items: recommendConnections({
            connections,
            targetRole: candidate.targetRole,
            skills: [...candidate.skills, ...(Array.isArray(profile.skills) ? profile.skills : [])],
        }) });
    }

    async function getUsageAnalytics(req, res) {
        const candidate = await prisma.candidate.findFirst({
            where: { workspaceId: req.workspace.id, userId: req.user.id },
            include: { subscription: true },
        });
        if (!candidate) return res.status(404).json({ message: 'Candidate profile not found' });
        const periodStart = candidate.subscription?.currentPeriodStart || new Date();
        const period = periodStart.toISOString().slice(0, 7);
        const [usage, drafts] = await Promise.all([
            prisma.candidateUsage.findMany({ where: { candidateId: candidate.id, period } }),
            prisma.candidateDraft.findMany({ where: { candidateId: candidate.id }, select: { kind: true, status: true } }),
        ]);
        return res.json(buildTalentUsageAnalytics({ subscription: candidate.subscription, usage, drafts }));
    }

    async function getPlanCatalog(req, res) {
        const candidate = await prisma.candidate.findFirst({ where: { workspaceId: req.workspace.id, userId: req.user.id }, include: { subscription: true } });
        if (!candidate) return res.status(404).json({ message: 'Candidate profile not found' });
        return res.json(buildTalentPlanCatalog({ plan: candidate.subscription?.plan, status: candidate.subscription?.status }));
    }

    async function requestUpgrade(req, res) {
        const candidate = await prisma.candidate.findFirst({ where: { workspaceId: req.workspace.id, userId: req.user.id }, include: { subscription: true } });
        if (!candidate) return res.status(404).json({ message: 'Candidate profile not found' });
        let intent;
        try { intent = buildUpgradeIntent({ currentPlan: candidate.subscription?.plan }); }
        catch (error) { return res.status(422).json({ message: error.message }); }
        const audit = await recordAuditEvent({ prisma, workspaceId: req.workspace.id, actorUserId: req.user.id, entityType: 'candidate_upgrade_intent', entityId: `${candidate.id}:pro`, action: 'candidate.pro_upgrade_requested', metadata: { requestedPlan: intent.requestedPlan } });
        return res.status(202).json({ intent: { id: audit.id, ...intent } });
    }

    async function createResumeDraft(req, res) {
        const candidate = await resolveCandidate(req);
        if (!candidate) return res.status(404).json({ message: 'Candidate profile not found' });
        return res.status(201).json({ draft: buildResumeDraft({ profile: candidate.profile || {}, targetRole: req.body?.targetRole || candidate.targetRole }) });
    }

    async function createEngagementDraft(req, res) {
        const candidate = await prisma.candidate.findFirst({ where: { workspaceId: req.workspace.id, userId: req.user.id }, include: { subscription: true } });
        if (!candidate) return res.status(404).json({ message: 'Candidate profile not found' });
        try {
            const draft = buildEngagementDraft(req.body);
            const feature = usageFeatureForDraft(req.body?.format);
            if (feature) await consumeUsage({ prisma, candidateId: candidate.id, feature, plan: candidate.subscription?.plan === 'pro' ? 'pro' : 'free', period: periodKey() });
            const saved = await prisma.candidateDraft.create({ data: { candidateId: candidate.id, kind: draft.format, payload: draft } });
            return res.status(201).json({ draft, draftId: saved.id });
        }
        catch (error) { return res.status(422).json({ message: error.message }); }
    }

    async function listDrafts(req, res) {
        const candidate = await resolveCandidate(req);
        if (!candidate) return res.status(404).json({ message: 'Candidate profile not found' });
        const drafts = await prisma.candidateDraft.findMany({ where: { candidateId: candidate.id }, orderBy: { createdAt: 'desc' }, take: 50 });
        return res.json({ items: drafts.map((draft) => ({ id: draft.id, kind: draft.kind, status: draft.status, payload: draft.payload, createdAt: draft.createdAt, updatedAt: draft.updatedAt })) });
    }

    async function reviewDraft(req, res) {
        const candidate = await resolveCandidate(req);
        if (!candidate) return res.status(404).json({ message: 'Candidate profile not found' });
        const draft = await prisma.candidateDraft.findFirst({ where: { id: req.params.draftId, candidateId: candidate.id } });
        if (!draft) return res.status(404).json({ message: 'Draft not found' });
        let status;
        try { status = transitionCandidateDraft(draft.status, req.body?.status); }
        catch (error) { return res.status(422).json({ message: error.message }); }
        const updated = await prisma.$transaction(async (transaction) => {
            const saved = await transaction.candidateDraft.update({ where: { id: draft.id }, data: { status } });
            await recordAuditEvent({ prisma: transaction, workspaceId: req.workspace.id, actorUserId: req.user.id, entityType: 'candidate_draft', entityId: saved.id, action: `candidate.draft_${status}`, metadata: { kind: saved.kind } });
            return saved;
        });
        return res.json({ draft: { id: updated.id, kind: updated.kind, status: updated.status, payload: updated.payload, createdAt: updated.createdAt, updatedAt: updated.updatedAt } });
    }

    async function patchProfile(req, res) {
        try {
            const profile = await updateCandidateProfile({
                prisma,
                workspaceId: req.workspace.id,
                userId: req.user.id,
                actorUserId: req.user.id,
                updates: req.body,
            });
            return res.json(profile);
        } catch (error) {
            if (error.message === 'Candidate profile not found') return res.status(404).json({ message: error.message });
            if (error instanceof TypeError) return res.status(422).json({ message: error.message });
            throw error;
        }
    }

    async function patchVisibility(req, res) {
        try {
            const profile = await setCandidateVisibility({
                prisma,
                workspaceId: req.workspace.id,
                userId: req.user.id,
                actorUserId: req.user.id,
                visibility: req.body?.visibility,
            });
            return res.json(profile);
        } catch (error) {
            if (error.message === 'Candidate profile not found') return res.status(404).json({ message: error.message });
            if (error instanceof TypeError) return res.status(422).json({ message: error.message });
            throw error;
        }
    }

    async function listConsents(req, res) {
        const candidate = await resolveCandidate(req);
        if (!candidate) return res.status(404).json({ message: 'Candidate profile not found' });
        const consents = await prisma.candidateConsent.findMany({
            where: { candidateId: candidate.id, workspaceId: req.workspace.id },
            include: { client: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'desc' },
        });
        return res.json({ items: consents.map((consent) => ({
            id: consent.id,
            client: consent.client ? { id: consent.client.id, name: consent.client.name } : null,
            purpose: consent.purpose,
            status: consent.revokedAt ? 'revoked' : 'active',
            grantedAt: consent.grantedAt,
            revokedAt: consent.revokedAt,
            createdAt: consent.createdAt,
        })) });
    }

    async function revokeConsent(req, res) {
        const candidate = await resolveCandidate(req);
        if (!candidate) return res.status(404).json({ message: 'Candidate profile not found' });
        const consent = await prisma.candidateConsent.findFirst({
            where: { id: req.params.consentId, candidateId: candidate.id, workspaceId: req.workspace.id },
        });
        if (!consent) return res.status(404).json({ message: 'Consent not found' });
        if (consent.revokedAt) return res.json({ id: consent.id, status: 'revoked', revokedAt: consent.revokedAt });
        const revokedAt = new Date();
        const updated = await prisma.$transaction(async (transaction) => {
            await transaction.$queryRaw`SELECT "id" FROM "candidates" WHERE "id" = ${candidate.id} FOR UPDATE`;
            const saved = await transaction.candidateConsent.update({ where: { id: consent.id }, data: { revokedAt } });
            await recordAuditEvent({
                prisma: transaction,
                workspaceId: req.workspace.id,
                clientId: consent.clientId,
                actorUserId: req.user.id,
                entityType: 'candidate_consent',
                entityId: consent.id,
                action: 'candidate.consent_revoked',
                metadata: { candidateId: candidate.id, purpose: consent.purpose },
            });
            return saved;
        });
        return res.json({ id: updated.id, status: 'revoked', revokedAt: updated.revokedAt });
    }

    async function listScreeningInvitations(req, res) {
        const candidate = await resolveCandidate(req);
        if (!candidate) return res.status(404).json({ message: 'Candidate profile not found' });
        const sessions = await prisma.screeningSession.findMany({ where: { application: { candidateId: candidate.id }, status: { in: ['invited', 'consented', 'scheduled', 'in_progress'] } }, include: { application: { include: { job: { select: { id: true, title: true, client: { select: { id: true, name: true } } } } } } }, orderBy: { createdAt: 'desc' } });
        return res.json({ items: sessions.map((session) => ({ id: session.id, applicationId: session.applicationId, status: session.status, createdAt: session.createdAt, job: session.application.job })) });
    }
    async function consentToScreening(req, res) {
        const candidate = await resolveCandidate(req);
        if (!candidate) return res.status(404).json({ message: 'Candidate profile not found' });
        const session = await prisma.screeningSession.findFirst({ where: { id: req.params.sessionId, application: { candidateId: candidate.id } } });
        if (!session) return res.status(404).json({ message: 'Screening invitation not found' });
        if (typeof req.body?.consentVersion !== 'string' || !req.body.consentVersion.trim()) return res.status(422).json({ message: 'consentVersion is required' });
        try { transitionScreeningSession(session, 'consented'); } catch (error) { return res.status(422).json({ message: error.message }); }
        const updated = await prisma.$transaction(async (transaction) => {
            const saved = await transaction.screeningSession.update({ where: { id: session.id }, data: { status: 'consented', consentedAt: new Date(), consentVersion: req.body.consentVersion.trim() } });
            await recordAuditEvent({ prisma: transaction, workspaceId: req.workspace.id, actorUserId: req.user.id, entityType: 'screening_session', entityId: saved.id, action: 'screening.candidate_consent_recorded', metadata: { consentVersion: saved.consentVersion, applicationId: saved.applicationId } });
            return saved;
        });
        return res.json({ session: updated });
    }

    async function withdrawScreeningConsent(req, res) {
        const candidate = await resolveCandidate(req);
        if (!candidate) return res.status(404).json({ message: 'Candidate profile not found' });
        const session = await prisma.screeningSession.findFirst({ where: { id: req.params.sessionId, application: { candidateId: candidate.id } } });
        if (!session) return res.status(404).json({ message: 'Screening invitation not found' });
        try { transitionScreeningSession(session, 'withdrawn'); } catch (error) { return res.status(422).json({ message: error.message }); }
        const updated = await prisma.$transaction(async (transaction) => {
            const saved = await transaction.screeningSession.update({ where: { id: session.id }, data: { status: 'withdrawn', withdrawnAt: new Date() } });
            await recordAuditEvent({ prisma: transaction, workspaceId: req.workspace.id, actorUserId: req.user.id, entityType: 'screening_session', entityId: saved.id, action: 'screening.candidate_consent_withdrawn', metadata: { applicationId: saved.applicationId } });
            return saved;
        });
        return res.json({ session: updated });
    }

    return { getProfile, getPositioningAnalytics, listNetworkRecommendations, getUsageAnalytics, getPlanCatalog, requestUpgrade, createResumeDraft, createEngagementDraft, listDrafts, reviewDraft, patchProfile, patchVisibility, listConsents, revokeConsent, listScreeningInvitations, consentToScreening, withdrawScreeningConsent };
}

module.exports = { createTalentController };
