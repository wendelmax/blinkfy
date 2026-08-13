const crypto = require('crypto');
function verifySecret(received, expected) { if (!received || !expected) return false; const a = Buffer.from(String(received)); const b = Buffer.from(String(expected)); return a.length === b.length && crypto.timingSafeEqual(a, b); }
function validateInboundMessage(body = {}) { for (const field of ['externalMessageId', 'channel', 'content']) if (typeof body[field] !== 'string' || !body[field].trim()) throw new Error(`${field} is required`); if (body.content.length > 10000) throw new Error('content must be 10000 characters or fewer'); return { externalMessageId: body.externalMessageId.trim(), channel: body.channel.trim(), content: body.content.trim() }; }
module.exports = { verifySecret, validateInboundMessage };
