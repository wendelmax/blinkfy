const STRIPE_STATUS_MAP = {
    active: 'active',
    trialing: 'trialing',
    past_due: 'past_due',
    canceled: 'canceled',
    unpaid: 'past_due',
    incomplete_expired: 'expired',
    incomplete: 'active',
    paused: 'past_due',
};

function mapStripeStatus(stripeStatus) {
    return STRIPE_STATUS_MAP[stripeStatus] || 'active';
}

async function activateSubscription({ prisma, candidateId, stripeCustomerId, stripeSubscriptionId, stripeStatus, currentPeriodStart, currentPeriodEnd, trialEnd }) {
    const status = trialEnd && new Date(trialEnd * 1000) > new Date() ? 'trialing' : mapStripeStatus(stripeStatus || 'active');

    return prisma.candidateSubscription.upsert({
        where: { candidateId },
        create: {
            candidateId,
            plan: 'pro',
            status,
            provider: 'stripe',
            providerCustomerId: stripeCustomerId,
            providerSubscriptionId: stripeSubscriptionId,
            currentPeriodStart: currentPeriodStart ? new Date(currentPeriodStart * 1000) : new Date(),
            currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : null,
        },
        update: {
            plan: 'pro',
            status,
            providerCustomerId: stripeCustomerId,
            providerSubscriptionId: stripeSubscriptionId,
            currentPeriodStart: currentPeriodStart ? new Date(currentPeriodStart * 1000) : undefined,
            currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : undefined,
        },
    });
}

async function syncSubscriptionStatus({ prisma, candidateId, stripeStatus, currentPeriodStart, currentPeriodEnd }) {
    const subscription = await prisma.candidateSubscription.findUnique({ where: { candidateId } });
    if (!subscription) return null;

    const status = mapStripeStatus(stripeStatus);

    return prisma.candidateSubscription.update({
        where: { candidateId },
        data: {
            status,
            currentPeriodStart: currentPeriodStart ? new Date(currentPeriodStart * 1000) : undefined,
            currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : undefined,
        },
    });
}

async function cancelSubscription({ prisma, candidateId }) {
    const subscription = await prisma.candidateSubscription.findUnique({ where: { candidateId } });
    if (!subscription) return null;

    return prisma.candidateSubscription.update({
        where: { candidateId },
        data: { status: 'canceled' },
    });
}

async function expireSubscription({ prisma, candidateId }) {
    return prisma.candidateSubscription.update({
        where: { candidateId },
        data: { status: 'expired' },
    });
}

async function getSubscriptionByCandidateId({ prisma, candidateId }) {
    return prisma.candidateSubscription.findUnique({ where: { candidateId } });
}

async function getSubscriptionByStripeId({ prisma, stripeSubscriptionId }) {
    return prisma.candidateSubscription.findFirst({ where: { providerSubscriptionId: stripeSubscriptionId } });
}

async function getSubscriptionByStripeCustomerId({ prisma, stripeCustomerId }) {
    return prisma.candidateSubscription.findFirst({ where: { providerCustomerId: stripeCustomerId } });
}

module.exports = {
    activateSubscription,
    syncSubscriptionStatus,
    cancelSubscription,
    expireSubscription,
    getSubscriptionByCandidateId,
    getSubscriptionByStripeId,
    getSubscriptionByStripeCustomerId,
    mapStripeStatus,
    STRIPE_STATUS_MAP,
};
