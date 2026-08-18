const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const { createLivenessProvider } = require('./livenessProvider');

let prisma = new PrismaClient();
let livenessProvider = createLivenessProvider();
function setPrisma(client) { prisma = client; }
function setLivenessProvider(provider) { livenessProvider = provider; }

const KYC_VALIDITY_DAYS = 365;

async function initiateVerification(userId, { triggerReason, verificationType } = {}) {
    const existing = await prisma.kycVerification.findFirst({
        where: { userId, status: { in: ['pending', 'processing'] } },
    });
    if (existing) {
        throw Object.assign(new Error('A verification is already in progress'), { status: 422 });
    }

    const session = await livenessProvider.initiateLiveness({ userId });

    const verification = await prisma.kycVerification.create({
        data: {
            userId,
            verificationType: verificationType || 'liveness',
            status: 'pending',
            provider: session.provider,
            providerSessionId: session.sessionId,
            triggerReason: triggerReason || 'manual',
        },
    });

    return {
        verificationId: verification.id,
        sessionId: session.sessionId,
        provider: session.provider,
        challengeType: session.challengeType,
        expiresAt: session.expiresAt,
        captureUrl: session.captureUrl,
    };
}

async function submitCapture(userId, { verificationId, imageBase64, consentIp }) {
    const verification = await prisma.kycVerification.findFirst({
        where: { id: verificationId, userId },
    });
    if (!verification) throw Object.assign(new Error('Verification not found'), { status: 404 });
    if (verification.status !== 'pending') {
        throw Object.assign(new Error(`Cannot submit capture for verification in status "${verification.status}"`), { status: 422 });
    }

    await prisma.kycVerification.update({
        where: { id: verificationId },
        data: { status: 'processing' },
    });

    const result = await livenessProvider.processLivenessCapture({
        sessionId: verification.providerSessionId,
        imageBase64,
    });

    const updateData = {
        livenessScore: result.livenessScore,
        faceEmbeddingHash: result.faceEmbeddingHash,
        status: result.passed ? 'approved' : 'rejected',
        rejectionReason: result.passed ? null : `Liveness score ${result.livenessScore} below threshold`,
        consentGiven: true,
        consentIp: consentIp || null,
        consentTimestamp: new Date(),
    };

    if (result.passed) {
        updateData.verifiedAt = new Date();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + KYC_VALIDITY_DAYS);
        updateData.expiresAt = expiresAt;
    }

    return prisma.kycVerification.update({
        where: { id: verificationId },
        data: updateData,
    });
}

async function getVerificationStatus(userId, verificationId) {
    const verification = await prisma.kycVerification.findFirst({
        where: { id: verificationId, userId },
        select: {
            id: true,
            verificationType: true,
            status: true,
            provider: true,
            livenessScore: true,
            matchScore: true,
            rejectionReason: true,
            verifiedAt: true,
            expiresAt: true,
            triggerReason: true,
            createdAt: true,
        },
    });
    if (!verification) throw Object.assign(new Error('Verification not found'), { status: 404 });
    return verification;
}

async function listVerifications(userId, { status, verificationType } = {}) {
    const where = { userId };
    if (status) where.status = status;
    if (verificationType) where.verificationType = verificationType;
    return prisma.kycVerification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            verificationType: true,
            status: true,
            provider: true,
            livenessScore: true,
            verifiedAt: true,
            expiresAt: true,
            triggerReason: true,
            createdAt: true,
        },
    });
}

async function getCandidateKycStatus(userId) {
    const latest = await prisma.kycVerification.findFirst({
        where: { userId, status: 'approved' },
        orderBy: { verifiedAt: 'desc' },
        select: {
            id: true,
            status: true,
            verifiedAt: true,
            expiresAt: true,
            verificationType: true,
        },
    });

    const isExpired = latest && latest.expiresAt && new Date(latest.expiresAt) < new Date();

    return {
        verified: !!latest && !isExpired,
        verification: latest || null,
        isExpired,
    };
}

async function revokeVerification(userId, verificationId) {
    const verification = await prisma.kycVerification.findFirst({
        where: { id: verificationId, userId },
    });
    if (!verification) throw Object.assign(new Error('Verification not found'), { status: 404 });

    return prisma.kycVerification.update({
        where: { id: verificationId },
        data: { status: 'rejected', rejectionReason: 'Revoked by user' },
    });
}

module.exports = {
    initiateVerification,
    submitCapture,
    getVerificationStatus,
    listVerifications,
    getCandidateKycStatus,
    revokeVerification,
    setPrisma,
    setLivenessProvider,
    KYC_VALIDITY_DAYS,
};
