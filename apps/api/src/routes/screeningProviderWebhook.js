const express = require('express');
const { recordAuditEvent } = require('../services/blinkfy/auditService');
const { verifyWebhookSecret, validateProviderResult } = require('../services/blinkfy/screeningProviderWebhookService');

function createScreeningProviderWebhookRouter({ prisma }) {
    const router = express.Router();
    router.post('/:sessionId', async (req, res) => {
        if (!verifyWebhookSecret(req.get('x-blinkfy-webhook-secret'), process.env.SCREENING_WEBHOOK_SECRET)) return res.status(401).json({ message: 'Invalid webhook secret' });
        let input; try { input = validateProviderResult(req.body); } catch (error) { return res.status(422).json({ message: error.message }); }
        const session = await prisma.screeningSession.findUnique({ where: { id: req.params.sessionId }, include: { application: { include: { client: true } } } });
        if (!session) return res.status(404).json({ message: 'Screening session not found' });
        if (!session.consentedAt || session.status === 'withdrawn') return res.status(403).json({ message: 'Screening consent required' });
        if (input.status === 'completed' && session.status !== 'in_progress') return res.status(422).json({ message: 'Screening must be in progress before completion' });
        const result = await prisma.$transaction(async (transaction) => {
            const existing = await transaction.screeningWebhookEvent.findUnique({ where: { eventId: input.eventId } });
            if (existing) return { duplicate: true, sessionStatus: session.status };
            await transaction.screeningWebhookEvent.create({ data: { eventId: input.eventId, sessionId: session.id } });
            if (input.transcript) await transaction.screeningEvidence.create({ data: { sessionId: session.id, kind: 'transcript', content: input.transcript.content, uri: input.transcript.uri, confidence: input.transcript.confidence } });
            if (input.insight) await transaction.screeningEvidence.create({ data: { sessionId: session.id, kind: 'insight', content: input.insight.content, uri: input.insight.uri, confidence: input.insight.confidence } });
            const status = input.status === 'completed' ? 'completed' : session.status;
            const saved = status === session.status ? session : await transaction.screeningSession.update({ where: { id: session.id }, data: { status, completedAt: status === 'completed' ? new Date() : undefined } });
            await recordAuditEvent({ prisma: transaction, workspaceId: session.application.client.workspaceId, clientId: session.application.clientId, entityType: 'screening_session', entityId: session.id, action: 'screening.provider_result_received', metadata: { eventId: input.eventId, status: input.status } });
            return { duplicate: false, sessionStatus: saved.status };
        });
        return res.status(result.duplicate ? 200 : 202).json(result);
    });
    return router;
}
module.exports = { createScreeningProviderWebhookRouter };
