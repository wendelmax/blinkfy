const events = new Set(['candidate.connected', 'candidate.responded', 'screening.completed', 'stage.changed']);

function buildWebhookEvent({ type, candidateId, applicationId, stage, occurredAt = new Date() } = {}) {
  if (!events.has(type)) throw new Error('unsupported webhook event');
  if (!candidateId || !applicationId) throw new Error('candidateId and applicationId are required');
  return { id: `evt_${applicationId}_${Date.parse(occurredAt)}`, type, candidateId, applicationId, ...(stage ? { stage } : {}), occurredAt: new Date(occurredAt).toISOString(), externalDelivery: 'approval_required' };
}

module.exports = { events, buildWebhookEvent };
