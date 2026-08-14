const { recordAuditEvent } = require('../../services/blinkfy/auditService');
const { validateWebhookSubscription } = require('../../services/blinkfy/conciergeWebhookSubscriptionService');
function createConciergeWebhookSubscriptionController({ prisma }) {
  async function get(req, res) { const item = await prisma.conciergeWebhookSubscription.findUnique({ where: { clientId: req.client.id } }); return res.json({ subscription: item && { ...item, secret: undefined } }); }
  async function update(req, res) {
    let input; try { input = validateWebhookSubscription(req.body); } catch (error) { return res.status(422).json({ message: error.message }); }
    const subscription = await prisma.$transaction(async (transaction) => {
      const saved = await transaction.conciergeWebhookSubscription.upsert({ where: { clientId: req.client.id }, create: { clientId: req.client.id, ...input }, update: input });
      await recordAuditEvent({ prisma: transaction, workspaceId: req.workspace.id, clientId: req.client.id, actorUserId: req.user.id, entityType: 'concierge_webhook_subscription', entityId: saved.id, action: 'concierge.webhook_subscription_updated', metadata: { url: saved.url, events: saved.events, enabled: saved.enabled } });
      return saved;
    });
    return res.json({ subscription: { ...subscription, secret: undefined } });
  }
  return { get, update };
}
module.exports = { createConciergeWebhookSubscriptionController };
