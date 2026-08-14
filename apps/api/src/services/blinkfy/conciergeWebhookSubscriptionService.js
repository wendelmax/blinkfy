const crypto = require('crypto');
const allowedEvents = new Set(['candidate.connected', 'candidate.responded', 'screening.completed', 'stage.changed', 'follow_up.interrupted']);
function validateWebhookSubscription(body = {}) {
  const url = typeof body.url === 'string' ? body.url.trim() : '';
  let parsed; try { parsed = new URL(url); } catch { throw new Error('url must be a valid https URL'); }
  if (parsed.protocol !== 'https:') throw new Error('url must use https');
  const secret = typeof body.secret === 'string' ? body.secret.trim() : '';
  if (secret.length < 8) throw new Error('secret must be at least 8 characters');
  const events = Array.isArray(body.events) ? [...new Set(body.events)] : [];
  if (!events.length || events.some((event) => !allowedEvents.has(event))) throw new Error('event is unsupported or missing');
  return { url, events, secret, enabled: body.enabled !== false };
}
function signWebhookPayload({ eventId, body, secret }) { return crypto.createHmac('sha256', secret).update(`${eventId}.${JSON.stringify(body)}`).digest('hex'); }
module.exports = { allowedEvents, validateWebhookSubscription, signWebhookPayload };
