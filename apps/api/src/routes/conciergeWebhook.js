const express = require('express');
const { recordAuditEvent } = require('../services/blinkfy/auditService');
const { verifySecret, validateInboundMessage } = require('../services/blinkfy/conciergeInboundService');
function createConciergeWebhookRouter({ prisma }) {
  const router = express.Router();
  router.post('/:applicationId/messages', async (req, res) => {
    if (!verifySecret(req.get('x-blinkfy-webhook-secret'), process.env.CONCIERGE_WEBHOOK_SECRET)) return res.status(401).json({ message: 'Invalid webhook secret' });
    let input; try { input = validateInboundMessage(req.body); } catch (error) { return res.status(422).json({ message: error.message }); }
    const application = await prisma.candidateApplication.findFirst({ where: { id: req.params.applicationId }, include: { client: true } });
    if (!application) return res.status(404).json({ message: 'Application not found' });
    const result = await prisma.$transaction(async (transaction) => {
      const existing = await transaction.conciergeMessage.findUnique({ where: { externalMessageId: input.externalMessageId } });
      if (existing) return { duplicate: true, message: existing };
      const message = await transaction.conciergeMessage.create({ data: { applicationId: application.id, ...input } });
      await recordAuditEvent({ prisma: transaction, workspaceId: application.client.workspaceId, clientId: application.clientId, entityType: 'concierge_message', entityId: message.id, action: 'concierge.inbound_message_received', metadata: { externalMessageId: message.externalMessageId, channel: message.channel } });
      return { duplicate: false, message };
    });
    return res.status(result.duplicate ? 200 : 202).json(result);
  });
  return router;
}
module.exports = { createConciergeWebhookRouter };
