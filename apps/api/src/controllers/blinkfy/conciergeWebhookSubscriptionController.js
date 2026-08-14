const { recordAuditEvent } = require('../../services/blinkfy/auditService');
const { validateWebhookSubscription } = require('../../services/blinkfy/conciergeWebhookSubscriptionService');
const { signWebhookPayload } = require('../../services/blinkfy/conciergeWebhookSubscriptionService');
const { buildWebhookEvent } = require('../../services/blinkfy/conciergeWebhookService');
const { buildOutboxRecord, transitionOutboxReview } = require('../../services/blinkfy/conciergeWebhookOutboxService');
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
  async function preview(req, res) {
    const subscription = await prisma.conciergeWebhookSubscription.findUnique({ where: { clientId: req.client.id } });
    if (!subscription) return res.status(404).json({ message: 'Webhook subscription not found' });
    let event; try { event = buildWebhookEvent(req.body); } catch (error) { return res.status(422).json({ message: error.message }); }
    if (!subscription.events.includes(event.type)) return res.status(422).json({ message: 'Event is not enabled for this subscription' });
    const signature = signWebhookPayload({ eventId: event.id, body: event, secret: subscription.secret });
    const record = buildOutboxRecord({ clientId: req.client.id, event, signature });
    const outbox = await prisma.conciergeWebhookOutbox.upsert({ where: { clientId_eventId: { clientId: req.client.id, eventId: event.id } }, create: record, update: {} });
    return res.json({ delivery: { url: subscription.url, eventId: event.id, eventType: event.type, signature, approved: false, transmitted: false, outboxId: outbox.id, status: outbox.status } });
  }
  async function listOutbox(req, res) { const items = await prisma.conciergeWebhookOutbox.findMany({ where: { clientId: req.client.id }, orderBy: { createdAt: 'desc' }, take: 50 }); return res.json({ items }); }
  async function reviewOutbox(req, res) {
    const item = await prisma.conciergeWebhookOutbox.findFirst({ where: { id: req.params.outboxId, clientId: req.client.id } });
    if (!item) return res.status(404).json({ message: 'Webhook outbox item not found' });
    let status; try { status = transitionOutboxReview(item.status, req.body?.status); } catch (error) { return res.status(422).json({ message: error.message }); }
    const updated = await prisma.$transaction(async (transaction) => {
      const saved = await transaction.conciergeWebhookOutbox.update({ where: { id: item.id }, data: { status } });
      await recordAuditEvent({ prisma: transaction, workspaceId: req.workspace.id, clientId: req.client.id, actorUserId: req.user.id, entityType: 'concierge_webhook_outbox', entityId: saved.id, action: `concierge.webhook_outbox_${status}`, metadata: { eventType: saved.eventType } });
      return saved;
    });
    return res.json({ item: updated, transmitted: false });
  }
  return { get, update, preview, listOutbox, reviewOutbox };
}
module.exports = { createConciergeWebhookSubscriptionController };
