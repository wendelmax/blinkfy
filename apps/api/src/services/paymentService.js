/**
 * Payment service: exchange rate (API or env), net salary, wallet persistence.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const EXCHANGE_RATE_APIS = {
    BRL: process.env.EXCHANGE_RATE_API || 'https://api.frankfurter.app/latest?from=USD&to=BRL',
    ARS: process.env.EXCHANGE_RATE_API_ARS || 'https://api.frankfurter.app/latest?from=USD&to=ARS',
    MXN: process.env.EXCHANGE_RATE_API_MXN || 'https://api.frankfurter.app/latest?from=USD&to=MXN',
};

const EXCHANGE_RATE_FALLBACKS = {
    BRL: parseFloat(process.env.EXCHANGE_RATE) || 5.5,
    ARS: parseFloat(process.env.EXCHANGE_RATE_ARS) || 1000,
    MXN: parseFloat(process.env.EXCHANGE_RATE_MXN) || 18,
};

async function fetchExchangeRate(toCurrency = 'BRL') {
    try {
        const res = await fetch(EXCHANGE_RATE_APIS[toCurrency]);
        if (!res.ok) throw new Error('Rate API error');
        const data = await res.json();
        const rate = data?.rates?.[toCurrency] ?? data?.rates?.[toCurrency.toLowerCase()];
        if (rate != null) {
            await prisma.exchangeRateLog.create({
                data: { fromCur: 'USD', toCur: toCurrency, rate, source: 'api' },
            }).catch(() => null);
            return { rate, source: 'api' };
        }
    } catch (err) {
        console.warn(`Exchange rate API failed for ${toCurrency}, using fallback:`, err.message);
    }
    const fallback = EXCHANGE_RATE_FALLBACKS[toCurrency];
    await prisma.exchangeRateLog.create({
        data: { fromCur: 'USD', toCur: toCurrency, rate: fallback, source: 'env' },
    }).catch(() => null);
    return { rate: fallback, source: 'env' };
}

async function getExchangeRateWithSource(toCurrency = 'BRL') {
    const last = await prisma.exchangeRateLog.findFirst({
        where: { fromCur: 'USD', toCur: toCurrency },
        orderBy: { createdAt: 'desc' },
    });
    const maxAgeMs = 60 * 60 * 1000;
    if (last && (Date.now() - last.createdAt.getTime() < maxAgeMs)) return { rate: last.rate, source: last.source };
    return fetchExchangeRate(toCurrency);
}

async function getExchangeRate(toCurrency = 'BRL') {
    return (await getExchangeRateWithSource(toCurrency)).rate;
}

exports.getExchangeRate = getExchangeRate;

exports.calculateNetSalary = async (grossUsd, toCurrency = 'BRL') => {
    const { rate, source } = await getExchangeRateWithSource(toCurrency);
    const grossLocal = grossUsd * rate;
    return { grossUsd, grossLocal, currency: toCurrency, exchangeRate: rate, exchangeRateSource: source };
};

exports.getWalletSummaryForUser = async (userId, salaryUsd) => {
    const amount = parseFloat(salaryUsd) || 0;
    const taxService = require('./taxService');
    const [transactions, candidateProfile] = await Promise.all([
        prisma.walletTransaction.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50,
        }),
        prisma.candidateProfile.findUnique({ where: { userId } }),
    ]);
    const balanceUsd = transactions.reduce((sum, t) => {
        if (t.status !== 'completed') return sum;
        return sum + (t.type === 'withdrawal' ? -t.amountUsd : t.amountUsd);
    }, 0);
    const pendingEscrow = transactions
        .filter((t) => t.status === 'pending' && t.type !== 'withdrawal')
        .reduce((sum, t) => sum + t.amountUsd, 0);
    const projectionAmount = amount > 0 ? amount : (balanceUsd > 0 ? balanceUsd : 5000);
    const taxResidence = candidateProfile?.taxResidence;
    const currency = taxService.resolveCurrencyForResidence(taxResidence);
    const currencyData = await exports.calculateNetSalary(projectionAmount, currency);
    const taxData = await taxService.calculateTaxesByResidence(taxResidence, currencyData.grossLocal);
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
