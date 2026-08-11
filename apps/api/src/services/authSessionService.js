const crypto = require('crypto');

function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

async function issueSession(prisma, user, signToken, expiresAt) {
    const sessionId = crypto.randomUUID();
    const token = signToken({ id: user.id, sid: sessionId });
    await prisma.session.create({
        data: { id: sessionId, userId: user.id, tokenHash: hashToken(token), expiresAt },
    });
    return token;
}

module.exports = { hashToken, issueSession };
