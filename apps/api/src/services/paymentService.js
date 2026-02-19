/**
 * Payment service: exchange rate (API or env), net salary, wallet persistence.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const EXCHANGE_RATE_API = process.env.EXCHANGE_RATE_API || 'https://api.frankfurter.app/latest?from=USD&to=BRL';
const EXCHANGE_RATE_FALLBACK = parseFloat(process.env.EXCHANGE_RATE) || 5.5;

async function fetchExchangeRate() {
    try {
        const res = await fetch(EXCHANGE_RATE_API);
        if (!res.ok) throw new Error('Rate API error');
        const data = await res.json();
        const rate = data?.rates?.BRL ?? data?.rates?.brl;
        if (rate != null) {
            await prisma.exchangeRateLog.create({
                data: { fromCur: 'USD', toCur: 'BRL', rate, source: 'api' },
            }).catch(() => null);
            return rate;
        }
    } catch (err) {
        console.warn('Exchange rate API failed, using fallback:', err.message);
    }
    await prisma.exchangeRateLog.create({
        data: { fromCur: 'USD', toCur: 'BRL', rate: EXCHANGE_RATE_FALLBACK, source: 'env' },
    }).catch(() => null);
    return EXCHANGE_RATE_FALLBACK;
}

async function getExchangeRate() {
    const last = await prisma.exchangeRateLog.findFirst({
        where: { fromCur: 'USD', toCur: 'BRL' },
        orderBy: { createdAt: 'desc' },
    });
    const maxAgeMs = 60 * 60 * 1000;
    if (last && (Date.now() - last.createdAt.getTime() < maxAgeMs)) return last.rate;
    return fetchExchangeRate();
}

exports.getExchangeRate = getExchangeRate;

exports.calculateNetSalary = async (grossUsd) => {
    const rate = await getExchangeRate();
    const grossBrl = grossUsd * rate;
    return { grossUsd, grossBrl, exchangeRate: rate };
};

exports.getWalletSummaryForUser = async (userId, salaryUsd) => {
    const amount = parseFloat(salaryUsd) || 0;
    const taxService = require('./taxService');
    const transactions = await prisma.walletTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
    });
    const balanceUsd = transactions.reduce((sum, t) => {
        if (t.status !== 'completed') return sum;
        return sum + (t.type === 'withdrawal' ? -t.amountUsd : t.amountUsd);
    }, 0);
    const pendingEscrow = transactions
        .filter((t) => t.status === 'pending' && t.type !== 'withdrawal')
        .reduce((sum, t) => sum + t.amountUsd, 0);
    const projectionAmount = amount > 0 ? amount : (balanceUsd > 0 ? balanceUsd : 5000);
    const currencyData = await exports.calculateNetSalary(projectionAmount);
    const taxData = await taxService.calculateBrazilTaxes(currencyData.grossBrl);
    return {
        wallet: { balanceUsd, availableForWithdrawal: Math.max(0, balanceUsd * 0.9), pendingEscrow },
        projections: { ...currencyData, ...taxData },
        fees: { platformSpread: 0.02, transferFeeUsd: 15 },
        transactions: transactions.map((t) => ({
            id: t.id,
            type: t.type,
            description: t.description,
            amount: t.type === 'withdrawal' ? -t.amountUsd : t.amountUsd,
            date: t.createdAt.toISOString().slice(0, 10),
            status: t.status,
        })),
    };
};

exports.getRecruiterEarnings = async (recruiterId) => {
    const placements = await prisma.placement.findMany({
        where: { recruiterId },
        orderBy: { createdAt: 'desc' },
    });
    const totalEarned = placements.filter((p) => p.successFeeReleased).reduce((sum, p) => sum + p.successFeeUsd, 0);
    const totalRetentionReleased = placements.filter((p) => p.retentionReleased).reduce((sum, p) => sum + p.retentionBonusUsd, 0);
    const pendingRetention = placements.filter((p) => !p.retentionReleased && p.successFeeReleased).reduce((sum, p) => sum + p.retentionBonusUsd, 0);
    const nextRelease = placements.find((p) => !p.retentionReleased && p.retentionReleaseDate);
    return {
        totalEarned: totalEarned + totalRetentionReleased,
        pendingRetention,
        nextPayout: nextRelease?.retentionReleaseDate?.toISOString().slice(0, 10) ?? null,
        transactions: placements.slice(0, 20).map((p) => ({
            id: p.id,
            date: p.createdAt.toISOString().slice(0, 10),
            successFeeUsd: p.successFeeUsd,
            retentionReleased: p.retentionReleased,
            status: p.successFeeReleased ? (p.retentionReleased ? 'PAID' : 'PENDING_RETENTION') : 'PENDING',
        })),
    };
};

exports.createWalletTransaction = async (userId, data) => {
    return prisma.walletTransaction.create({
        data: {
            userId,
            type: data.type,
            amountUsd: data.amountUsd,
            amountBrl: data.amountBrl ?? null,
            exchangeRate: data.exchangeRate ?? null,
            description: data.description ?? null,
            status: data.status || 'completed',
        },
    });
};
