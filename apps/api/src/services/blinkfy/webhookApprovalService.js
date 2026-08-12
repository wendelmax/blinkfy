function prepareWebhookDispatch(event, approval = {}) {
  if (!event || !event.id || !event.type) throw new Error('valid event is required');
  if (approval.eventId !== event.id || approval.approved !== true) return { dispatchable: false, reason: 'human approval required', eventId: event.id };
  return { dispatchable: true, eventId: event.id, idempotencyKey: `blinkfy:${event.id}` };
}

module.exports = { prepareWebhookDispatch };
