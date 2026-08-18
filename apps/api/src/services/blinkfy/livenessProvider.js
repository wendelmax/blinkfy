const crypto = require('crypto');

function createMockLivenessProvider() {
    async function initiateLiveness({ userId, callbackUrl }) {
        const sessionId = `mock_session_${crypto.randomUUID()}`;
        return {
            sessionId,
            provider: 'mock',
            challengeType: 'smile',
            expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
            captureUrl: callbackUrl ? `${callbackUrl}?session=${sessionId}` : null,
        };
    }

    async function processLivenessCapture({ sessionId, imageBase64 }) {
        const embedding = crypto.randomBytes(128).toString('base64');
        const embeddingHash = crypto.createHash('sha256').update(embedding).digest('hex');
        const livenessScore = 0.85 + Math.random() * 0.15;

        return {
            sessionId,
            passed: livenessScore >= 0.7,
            livenessScore: Math.round(livenessScore * 100) / 100,
            faceEmbeddingHash: embeddingHash,
            provider: 'mock',
            processedAt: new Date().toISOString(),
        };
    }

    async function compareFaces({ embeddingHashA, embeddingHashB }) {
        const matchScore = embeddingHashA === embeddingHashB ? 1.0 : 0.5 + Math.random() * 0.4;
        return {
            match: matchScore >= 0.8,
            score: Math.round(matchScore * 100) / 100,
            provider: 'mock',
        };
    }

    async function getStatus(sessionId) {
        return {
            sessionId,
            status: 'completed',
            provider: 'mock',
        };
    }

    return { initiateLiveness, processLivenessCapture, compareFaces, getStatus };
}

function createLivenessProvider(config = {}) {
    const provider = config.provider || process.env.KYC_PROVIDER || 'mock';

    switch (provider) {
        case 'mock':
            return createMockLivenessProvider();
        default:
            console.warn(`Unknown KYC provider "${provider}", falling back to mock`);
            return createMockLivenessProvider();
    }
}

module.exports = { createLivenessProvider, createMockLivenessProvider };
