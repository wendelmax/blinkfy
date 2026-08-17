const { recordAuditEvent } = require('../services/blinkfy/auditService');
const { createNfeEmission, emitNfe, queryNfeStatus, cancelNfeEmission, listNfeEmissions, getNfeSummary } = require('../services/blinkfy/nfeEmissionService');

function createNfeController({ prisma, nfeProvider }) {
    async function getSummary(req, res) {
        const summary = await getNfeSummary({ prisma, userId: req.user.id });
        return res.json(summary);
    }

    async function listEmissions(req, res) {
        const emissions = await listNfeEmissions({ prisma, userId: req.user.id, status: req.query.status, limit: parseInt(req.query.limit) || 50 });
        return res.json({ items: emissions.map((e) => ({
            id: e.id,
            invoiceId: e.invoiceId,
            nfeNumber: e.nfeNumber,
            status: e.status,
            cnaeCode: e.cnaeCode,
            amountUsd: e.amountUsd,
            amountBrl: e.amountBrl,
            issExempt: e.issExempt,
            createdAt: e.createdAt.toISOString(),
        })) });
    }

    async function createEmission(req, res) {
        try {
            const emission = await createNfeEmission({
                prisma,
                invoiceId: req.body.invoiceId,
                userId: req.user.id,
                cnaeCode: req.body.cnaeCode,
                taxRegime: req.body.taxRegime,
                serviceDescription: req.body.serviceDescription,
            });
            await recordAuditEvent({
                prisma,
                workspaceId: req.workspace?.id,
                actorUserId: req.user.id,
                entityType: 'nfe_emission',
                entityId: emission.id,
                action: 'nfe.emission_created',
                metadata: { invoiceId: emission.invoiceId, cnaeCode: emission.cnaeCode },
            });
            return res.status(201).json({ emission: { id: emission.id, status: emission.status, cnaeCode: emission.cnaeCode } });
        } catch (error) {
            return res.status(422).json({ message: error.message });
        }
    }

    async function emitEmission(req, res) {
        try {
            const emission = await emitNfe({ prisma, nfeProvider, emissionId: req.params.emissionId });
            await recordAuditEvent({
                prisma,
                workspaceId: req.workspace?.id,
                actorUserId: req.user.id,
                entityType: 'nfe_emission',
                entityId: emission.id,
                action: 'nfe.emission_submitted',
                metadata: { status: emission.status, nfeNumber: emission.nfeNumber },
            });
            return res.json({ emission: { id: emission.id, status: emission.status, nfeNumber: emission.nfeNumber, protocolNumber: emission.protocolNumber } });
        } catch (error) {
            return res.status(422).json({ message: error.message });
        }
    }

    async function queryStatus(req, res) {
        try {
            const emission = await queryNfeStatus({ prisma, nfeProvider, emissionId: req.params.emissionId });
            return res.json({ emission: { id: emission.id, status: emission.status, nfeNumber: emission.nfeNumber, protocolNumber: emission.protocolNumber, xmlUri: emission.xmlUri, pdfUri: emission.pdfUri } });
        } catch (error) {
            return res.status(422).json({ message: error.message });
        }
    }

    async function cancelEmission(req, res) {
        try {
            const emission = await cancelNfeEmission({ prisma, nfeProvider, emissionId: req.params.emissionId, reason: req.body?.reason });
            await recordAuditEvent({
                prisma,
                workspaceId: req.workspace?.id,
                actorUserId: req.user.id,
                entityType: 'nfe_emission',
                entityId: emission.id,
                action: 'nfe.emission_cancelled',
                metadata: { reason: req.body?.reason },
            });
            return res.json({ emission: { id: emission.id, status: emission.status, cancelledAt: emission.cancelledAt?.toISOString() } });
        } catch (error) {
            return res.status(422).json({ message: error.message });
        }
    }

    return { getSummary, listEmissions, createEmission, emitEmission, queryStatus, cancelEmission };
}

module.exports = { createNfeController };
