const { PrismaClient } = require('@prisma/client');
let prisma = new PrismaClient();
function setPrisma(client) { prisma = client; }

const FEE_TYPES = {
    SUCCESS_FEE: 'success_fee',
    RETENTION_MGMT: 'retention_mgmt',
    LATAM_TAX_BRIDGE: 'latam_tax_bridge',
};

const DEFAULT_BASIS_POINTS = {
    success_fee: 2000,    // 20% of success fee
    retention_mgmt: 200,  // 2% of retention bonus
    latam_tax_bridge: 500, // 5% flat per transaction
};

function calculateBasisPoints(feeType, customBasisPoints) {
    return customBasisPoints ?? DEFAULT_BASIS_POINTS[feeType] ?? 0;
}

function calculateFeeAmount(amountUsd, basisPoints) {
    return Math.round(amountUsd * basisPoints / 10000 * 100) / 100;
}

async function createPlatformFee({ placementId, feeType, amountUsd, basisPoints }) {
    if (!placementId) throw new Error('placementId is required');
    if (!amountUsd || amountUsd <= 0) throw new Error('amountUsd must be positive');

    const bp = calculateBasisPoints(feeType, basisPoints);
    return prisma.platformFee.create({
        data: { placementId, feeType, amountUsd, basisPoints: bp },
    });
}

async function deductPlatformFee(feeId) {
    const fee = await prisma.platformFee.findUnique({ where: { id: feeId } });
    if (!fee) throw new Error('Platform fee not found');
    if (fee.status !== 'pending') throw new Error(`Fee already ${fee.status}`);

    return prisma.platformFee.update({
        where: { id: feeId },
        data: { status: 'deducted' },
    });
}

async function calculateAllFeesForPlacement(placement) {
    const fees = [];

    if (placement.successFeeUsd > 0) {
        const bp = DEFAULT_BASIS_POINTS.success_fee;
        fees.push({
            feeType: FEE_TYPES.SUCCESS_FEE,
            amountUsd: calculateFeeAmount(placement.successFeeUsd, bp),
            basisPoints: bp,
        });
    }

    if (placement.retentionBonusUsd > 0) {
        const bp = DEFAULT_BASIS_POINTS.retention_mgmt;
        fees.push({
            feeType: FEE_TYPES.RETENTION_MGMT,
            amountUsd: calculateFeeAmount(placement.retentionBonusUsd, bp),
            basisPoints: bp,
        });
    }

    return fees;
}

async function listFeesForPlacement(placementId) {
    return prisma.platformFee.findMany({
        where: { placementId },
        orderBy: { createdAt: 'desc' },
    });
}

async function listPendingFees() {
    return prisma.platformFee.findMany({
        where: { status: 'pending' },
        include: { placement: true },
        orderBy: { createdAt: 'desc' },
    });
}

module.exports = {
    FEE_TYPES,
    DEFAULT_BASIS_POINTS,
    calculateBasisPoints,
    calculateFeeAmount,
    createPlatformFee,
    deductPlatformFee,
    calculateAllFeesForPlacement,
    listFeesForPlacement,
    listPendingFees,
    setPrisma,
};
