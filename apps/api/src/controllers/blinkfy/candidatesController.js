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
            await prisma.$transaction(async (transaction) => {
                await transaction.$queryRaw`SELECT "id" FROM "candidates" WHERE "id" = ${candidate.id} FOR UPDATE`;
                await transaction.candidateConsent.updateMany({
                    where: { candidateId: candidate.id, workspaceId: req.workspace.id, purpose, clientId: clientId ?? null, revokedAt: null },
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
        const { clientId, jobId } = req.body || {};
        if (typeof clientId !== 'string' || clientId.trim() === '') {
            return res.status(422).json({ message: 'clientId is required' });
        }
        const candidate = await prisma.candidate.findFirst({
            where: { id: req.params.candidateId, workspaceId: req.workspace.id },
        });
        if (!candidate) {
            return res.status(404).json({ message: 'Candidate not found' });
        }
        const client = await prisma.client.findFirst({ where: { id: clientId, workspaceId: req.workspace.id } });
        if (!client) {
            return res.status(404).json({ message: 'Client not found' });
        }
        if (jobId !== undefined && (typeof jobId !== 'string' || jobId.trim() === '')) {
            return res.status(422).json({ message: 'jobId must be a nonempty string when provided' });
        }
        if (jobId) {
            const job = await prisma.blinkfyJob.findFirst({ where: { id: jobId, clientId: client.id } });
            if (!job) {
                return res.status(404).json({ message: 'Job not found for client' });
            }
        }
        let application;
        try {
            application = await prisma.$transaction(async (transaction) => {
                await transaction.$queryRaw`SELECT "id" FROM "candidates" WHERE "id" = ${candidate.id} FOR UPDATE`;
                const consents = await transaction.candidateConsent.findMany({
                    where: { candidateId: candidate.id, workspaceId: req.workspace.id, purpose: 'client_presentation', revokedAt: null },
                });
                if (!hasActivePresentationConsent(consents, client.id)) {
                    const error = new Error('ACTIVE_PRESENTATION_CONSENT_REQUIRED');
                    error.code = 'ACTIVE_PRESENTATION_CONSENT_REQUIRED';
                    throw error;
                }
                const existing = await transaction.candidateApplication.findFirst({
                    where: { candidateId: candidate.id, clientId: client.id, jobId: jobId || null },
                });
                const created = existing || await transaction.candidateApplication.create({
                    data: { candidateId: candidate.id, clientId: client.id, jobId: jobId || null, stage: 'mapped' },
                });
                await recordAuditEvent({
                    prisma: transaction, workspaceId: req.workspace.id, clientId: client.id, actorUserId: req.user.id,
                    entityType: 'candidate', entityId: candidate.id, action: 'candidate.shared', metadata: { applicationId: created.id, jobId: jobId || null },
                });
                return created;
            });
        } catch (error) {
            if (error.code === 'ACTIVE_PRESENTATION_CONSENT_REQUIRED') {
                return res.status(409).json({ message: 'Active client_presentation consent is required before sharing' });
            }
            throw error;
        }
        return res.status(201).json({ id: application.id, candidateId: application.candidateId, clientId: application.clientId, jobId: application.jobId, stage: application.stage });
    }

    return { getCandidate, recordConsent, shareCandidate };
}

module.exports = { createCandidatesController };
