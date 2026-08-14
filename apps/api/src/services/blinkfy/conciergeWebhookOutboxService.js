function buildOutboxRecord({ clientId, event, signature }) { return { clientId, eventId: event.id, eventType: event.type, signature, status: 'pending_approval' }; }
function transitionOutboxReview(current, next) {
  if (!['approved', 'rejected'].includes(next)) throw new Error('status must be approved or rejected');
  if (current !== 'pending_approval') throw new Error('delivery is already decided');
  return next;
}
module.exports = { buildOutboxRecord, transitionOutboxReview };
