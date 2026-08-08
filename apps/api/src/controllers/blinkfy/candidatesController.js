const { recordAuditEvent } = require('../../services/blinkfy/auditService');
const { findWorkspaceCandidate, hasActivePresentationConsent } = require('../../services/blinkfy/candidateService');

function serializeCandidate(candidate) {
    return {
        id: candidate.id,
        fullName: candidate.fullName,
        email: candidate.normalizedEmail,
        linkedinUrl: candidate.normalizedLinkedinUrl,
        profile: candidate.profile,
        visibility: candidate.visibility,
        createdAt: candidate.createdAt,
    };
}

function createCandidatesController({ prisma }) {
    async function getCandidate(req, res) {
        const candidate = await findWorkspaceCandidate({ prisma, workspaceId: req.workspace.id, candidateId: req.params.candidateId });
        if (!candidate) {
            return res.status(404).json({ message: 'Candidate not found' });
        }
        return res.json(serializeCandidate(candidate));
    }

    async function recordConsent(req, res) {
        const candidate = await findWorkspaceCandidate({ prisma, workspaceId: req.workspace.id, candidateId: req.params.candidateId });
        if (!candidate) {
            return res.status(404).json({ message: 'Candidate not found' });
        }
        const { purpose, clientId, evidence, revoke = false } = req.body || {};
        if (purpose !== 'client_presentation' || typeof evidence !== 'string' || evidence.trim() === '') {
            return res.status(422).json({ message: 'purpose client_presentation and evidence are required' });
        }
        if (clientId) {
            const client = await prisma.client.findFirst({ where: { id: clientId, workspaceId: req.workspace.id } });
            if (!client) {
                return res.status(404).json({ message: 'Client not found' });
            }
        }

        if (revoke) {
            const activeConsents = await prisma.candidateConsent.findMany({
                where: { candidateId: candidate.id, workspaceId: req.workspace.id, purpose, clientId: clientId ?? null, revokedAt: null },
            });
            await prisma.$transaction(async (transaction) => {
                await transaction.candidateConsent.updateMany({
                    where: { id: { in: activeConsents.map(({ id }) => id) } },
                    data: { revokedAt: new Date() },
                });
                await recordAuditEvent({
                    prisma: transaction, workspaceId: req.workspace.id, clientId, actorUserId: req.user.id,
                    entityType: 'candidate', entityId: candidate.id, action: 'candidate.consent_revoked', metadata: { purpose },
                });
            });
            return res.json({ candidateId: candidate.id, purpose, clientId: clientId ?? null, revoked: true });
        }

        const consent = await prisma.$transaction(async (transaction) => {
            const created = await transaction.candidateConsent.create({
                data: { candidateId: candidate.id, workspaceId: req.workspace.id, clientId: clientId ?? null, purpose, evidence: evidence.trim() },
            });
            await recordAuditEvent({
                prisma: transaction, workspaceId: req.workspace.id, clientId, actorUserId: req.user.id,
                entityType: 'candidate', entityId: candidate.id, action: 'candidate.consent_recorded', metadata: { purpose, consentId: created.id },
            });
            return created;
        });
        return res.status(201).json({ id: consent.id, candidateId: consent.candidateId, purpose: consent.purpose, clientId: consent.clientId, grantedAt: consent.grantedAt });
    }

    async function shareCandidate(req, res) {
        const { clientId } = req.body || {};
        if (typeof clientId !== 'string' || clientId.trim() === '') {
            return res.status(422).json({ message: 'clientId is required' });
        }
        const candidate = await prisma.candidate.findFirst({
            where: { id: req.params.candidateId, workspaceId: req.workspace.id },
            include: { consents: true },
        });
        if (!candidate) {
            return res.status(404).json({ message: 'Candidate not found' });
        }
        const client = await prisma.client.findFirst({ where: { id: clientId, workspaceId: req.workspace.id } });
        if (!client) {
            return res.status(404).json({ message: 'Client not found' });
        }
        if (!hasActivePresentationConsent(candidate.consents, client.id)) {
            return res.status(409).json({ message: 'Active client_presentation consent is required before sharing' });
        }

        const application = await prisma.$transaction(async (transaction) => {
            const created = await transaction.candidateApplication.upsert({
                where: { candidateId_clientId: { candidateId: candidate.id, clientId: client.id } },
                create: { candidateId: candidate.id, clientId: client.id, stage: 'mapped' },
                update: {},
            });
            await recordAuditEvent({
                prisma: transaction, workspaceId: req.workspace.id, clientId: client.id, actorUserId: req.user.id,
                entityType: 'candidate', entityId: candidate.id, action: 'candidate.shared', metadata: { applicationId: created.id },
            });
            return created;
        });
        return res.status(201).json({ id: application.id, candidateId: application.candidateId, clientId: application.clientId, stage: application.stage });
    }

    return { getCandidate, recordConsent, shareCandidate };
}

module.exports = { createCandidatesController };
