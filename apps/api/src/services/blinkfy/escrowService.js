const { PrismaClient } = require('@prisma/client');
let prisma = new PrismaClient();
function setPrisma(client) { prisma = client; }

const RETENTION_PERIOD_DAYS = 90;
const SUCCESS_FEE_RELEASE_DAYS = 1;
const MIN_WITHDRAWAL_USD = 50;

async function createEscrowHold({ placementId, amountUsd, currency = 'USD', holdReason = 'success_fee', releaseDays }) {
    if (!placementId) throw new Error('placementId is required');
    if (!amountUsd || amountUsd <= 0) throw new Error('amountUsd must be positive');

    const placement = await prisma.placement.findUnique({ where: { id: placementId } });
    if (!placement) throw new Error('Placement not found');

    const days = releaseDays ?? (holdReason === 'retention_bonus' ? RETENTION_PERIOD_DAYS : SUCCESS_FEE_RELEASE_DAYS);
    const releaseAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const hold = await prisma.escrowHold.create({
        data: { placementId, amountUsd, currency, holdReason, releaseAt },
    });

    return hold;
}

async function listEscrowHolds(filters = {}) {
    const where = {};
    if (filters.status) where.status = filters.status;
    if (filters.placementId) where.placementId = filters.placementId;
    if (filters.holdReason) where.holdReason = filters.holdReason;

    return prisma.escrowHold.findMany({
        where,
        include: { placement: true },
        orderBy: { createdAt: 'desc' },
        take: filters.limit ?? 50,
    });
}

async function getEscrowHold(holdId) {
    const hold = await prisma.escrowHold.findUnique({
        where: { id: holdId },
        include: { placement: true },
    });
    if (!hold) throw new Error('Escrow hold not found');
    return hold;
}

async function releaseEscrowHold(holdId) {
    const hold = await prisma.escrowHold.findUnique({ where: { id: holdId } });
    if (!hold) throw new Error('Escrow hold not found');
    if (hold.status !== 'held') throw new Error(`Cannot release hold in status: ${hold.status}`);
    if (hold.releaseAt > new Date()) throw new Error('Hold has not reached its release date yet');

    const updated = await prisma.escrowHold.update({
        where: { id: holdId },
        data: { status: 'released', releasedAt: new Date() },
    });

    if (hold.holdReason === 'success_fee') {
        await prisma.placement.update({
            where: { id: hold.placementId },
            data: { successFeeReleased: true },
        });
    } else if (hold.holdReason === 'retention_bonus') {
        await prisma.placement.update({
            where: { id: hold.placementId },
            data: { retentionReleased: true },
        });
    }

    return updated;
}

async function forfeitEscrowHold(holdId, reason = 'contract_terminated') {
    const hold = await prisma.escrowHold.findUnique({ where: { id: holdId } });
    if (!hold) throw new Error('Escrow hold not found');
    if (hold.status !== 'held') throw new Error(`Cannot forfeit hold in status: ${hold.status}`);

    return prisma.escrowHold.update({
        where: { id: holdId },
        data: { status: 'forfeited', releasedAt: new Date() },
    });
}

async function getEscrowSummary(userId) {
    const holds = await prisma.escrowHold.findMany({
        where: { placement: { recruiterId: userId } },
        include: { placement: true },
    });

    const held = holds.filter((h) => h.status === 'held');
    const totalHeldUsd = held.reduce((sum, h) => sum + h.amountUsd, 0);
    const nextRelease = held
        .filter((h) => h.releaseAt > new Date())
        .sort((a, b) => a.releaseAt - b.releaseAt)[0];

    return {
        totalHeldUsd,
        holdCount: held.length,
        nextReleaseDate: nextRelease?.releaseAt?.toISOString() ?? null,
        nextReleaseAmount: nextRelease?.amountUsd ?? 0,
        holds: held.map((h) => ({
            id: h.id,
            amountUsd: h.amountUsd,
            currency: h.currency,
            holdReason: h.holdReason,
            releaseAt: h.releaseAt.toISOString(),
            daysRemaining: Math.max(0, Math.ceil((h.releaseAt - Date.now()) / (24 * 60 * 60 * 1000))),
        })),
    };
}

async function processEligibleReleases() {
    const eligible = await prisma.escrowHold.findMany({
        where: { status: 'held', releaseAt: { lte: new Date() } },
    });

    const released = [];
    for (const hold of eligible) {
        const result = await releaseEscrowHold(hold.id);
        released.push(result);
    }
    return released;
}

module.exports = {
    createEscrowHold,
    listEscrowHolds,
    getEscrowHold,
    releaseEscrowHold,
    forfeitEscrowHold,
    getEscrowSummary,
    processEligibleReleases,
    MIN_WITHDRAWAL_USD,
    setPrisma,
};
