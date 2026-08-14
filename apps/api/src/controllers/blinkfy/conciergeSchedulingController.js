const { recordAuditEvent } = require('../../services/blinkfy/auditService');
const { buildCalendarPreview, validateSchedulingPolicy } = require('../../services/blinkfy/conciergeSchedulingService');

function createConciergeSchedulingController({ prisma }) {
  async function get(req, res) { const policy = await prisma.conciergeSchedulingPolicy.findUnique({ where: { clientId: req.client.id } }); return res.json({ policy }); }
  async function preview(req, res) { const policy = await prisma.conciergeSchedulingPolicy.findUnique({ where: { clientId: req.client.id } }); return res.json({ preview: buildCalendarPreview({ policy }) }); }
  async function update(req, res) {
    let input; try { input = validateSchedulingPolicy(req.body); } catch (error) { return res.status(422).json({ message: error.message }); }
    const policy = await prisma.$transaction(async (transaction) => {
      const saved = await transaction.conciergeSchedulingPolicy.upsert({ where: { clientId: req.client.id }, create: { clientId: req.client.id, timezone: input.timezone, windows: input.windows }, update: { timezone: input.timezone, windows: input.windows } });
      await recordAuditEvent({ prisma: transaction, workspaceId: req.workspace.id, clientId: req.client.id, actorUserId: req.user.id, entityType: 'concierge_scheduling_policy', entityId: saved.id, action: 'concierge.scheduling_policy_updated', metadata: { timezone: saved.timezone, windowCount: saved.windows.length } });
      return saved;
    });
    return res.json({ policy: { ...policy, requiresApproval: true, autonomousSending: false } });
  }
  return { get, update, preview };
}
module.exports = { createConciergeSchedulingController };
