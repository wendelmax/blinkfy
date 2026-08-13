const crypto = require('crypto');

function verifyWebhookSecret(received, expected) {
    if (!received || !expected) return false;
    const left = Buffer.from(String(received)); const right = Buffer.from(String(expected));
    return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function validateProviderResult(body = {}) {
    if (typeof body.eventId !== 'string' || !body.eventId.trim()) throw new Error('eventId is required');
    if (!['completed', 'failed'].includes(body.status)) throw new Error('status must be completed or failed');
    const evidence = body.evidence || {};
    const result = { eventId: body.eventId.trim(), status: body.status, transcript: null, insight: null };
    for (const kind of ['transcript', 'insight']) {
        if (evidence[kind]) {
            if (typeof evidence[kind].content !== 'string' && typeof evidence[kind].uri !== 'string') throw new Error(`${kind} evidence needs content or uri`);
            result[kind] = { content: evidence[kind].content || null, uri: evidence[kind].uri || null, confidence: evidence[kind].confidence ?? null };
        }
    }
    if (body.status === 'completed' && (!result.transcript || !result.insight)) throw new Error('completed results require transcript and insight evidence');
    return result;
}

module.exports = { verifyWebhookSecret, validateProviderResult };
