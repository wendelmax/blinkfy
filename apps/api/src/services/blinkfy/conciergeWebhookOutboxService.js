function buildOutboxRecord({ clientId, event, signature }) { return { clientId, eventId: event.id, eventType: event.type, signature, status: 'pending_approval' }; }
module.exports = { buildOutboxRecord };
