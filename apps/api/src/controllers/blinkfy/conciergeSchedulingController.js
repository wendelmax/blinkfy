const { recordAuditEvent } = require('../../services/blinkfy/auditService');
const { buildCalendarPreview, validateApprovalRequest, validateSchedulingPolicy } = require('../../services/blinkfy/conciergeSchedulingService');

function createConciergeSchedulingController({ prisma }) {
  async function get(req, res) { const policy = await prisma.conciergeSchedulingPolicy.findUnique({ where: { clientId: req.client.id } }); return res.json({ policy }); }
  async function preview(req, res) { const policy = await prisma.conciergeSchedulingPolicy.findUnique({ where: { clientId: req.client.id } }); return res.json({ preview: buildCalendarPreview({ policy }) }); }
  async function requestApproval(req, res) {
    const policy = await prisma.conciergeSchedulingPolicy.findUnique({ where: { clientId: req.client.id } });
    let slot; try { slot = validateApprovalRequest({ policy, start: req.body?.start, end: req.body?.end }); } catch (error) { return res.status(422).json({ message: error.message }); }
    const approval = await recordAuditEvent({ prisma, workspaceId: req.workspace.id, clientId: req.client.id, actorUserId: req.user.id, entityType: 'concierge_calendar_approval', entityId: `${req.client.id}:${slot.start}`, action: 'concierge.calendar_approval_requested', metadata: slot });
    return res.status(202).json({ approval: { id: approval.id, ...slot, requiresApproval: true, scheduled: false, transmitted: false } });
  }
  async function update(req, res) {
    let input; try { input = validateSchedulingPolicy(req.body); } catch (error) { return res.status(422).json({ message: error.message }); }
    const policy = await prisma.$transaction(async (transaction) => {
      const saved = await transaction.conciergeSchedulingPolicy.upsert({ where: { clientId: req.client.id }, create: { clientId: req.client.id, timezone: input.timezone, windows: input.windows }, update: { timezone: input.timezone, windows: input.windows } });
      await recordAuditEvent({ prisma: transaction, workspaceId: req.workspace.id, clientId: req.client.id, actorUserId: req.user.id, entityType: 'concierge_scheduling_policy', entityId: saved.id, action: 'concierge.scheduling_policy_updated', metadata: { timezone: saved.timezone, windowCount: saved.windows.length } });
      return saved;
    });
    return res.json({ policy: { ...policy, requiresApproval: true, autonomousSending: false } });
  }
  return { get, update, preview, requestApproval };
}
module.exports = { createConciergeSchedulingController };
