const {
    getCandidateProfile,
    updateCandidateProfile,
    setCandidateVisibility,
} = require('../../services/blinkfy/talentProfileService');
const { recordAuditEvent } = require('../../services/blinkfy/auditService');
const { getCandidatePositioningAnalytics } = require('../../services/blinkfy/talentPositioningService');
const { buildResumeDraft } = require('../../services/blinkfy/talentResumeDraftService');
const { buildEngagementDraft } = require('../../services/blinkfy/talentEngagementDraftService');

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

    async function createResumeDraft(req, res) {
        const candidate = await resolveCandidate(req);
        if (!candidate) return res.status(404).json({ message: 'Candidate profile not found' });
        return res.status(201).json({ draft: buildResumeDraft({ profile: candidate.profile || {}, targetRole: req.body?.targetRole || candidate.targetRole }) });
    }

    async function createEngagementDraft(req, res) {
        const candidate = await resolveCandidate(req);
        if (!candidate) return res.status(404).json({ message: 'Candidate profile not found' });
        try { return res.status(201).json({ draft: buildEngagementDraft(req.body) }); }
        catch (error) { return res.status(422).json({ message: error.message }); }
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

    return { getProfile, getPositioningAnalytics, createResumeDraft, createEngagementDraft, patchProfile, patchVisibility, listConsents, revokeConsent };
}

module.exports = { createTalentController };
