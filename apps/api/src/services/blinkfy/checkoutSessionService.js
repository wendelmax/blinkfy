const PLAN_PRICES = { pro: { monthly: process.env.STRIPE_PRO_MONTHLY_USD || '29.00', currency: 'usd' } };

async function createCheckoutSession({ billingProvider, prisma, candidateId, email }) {
    const existing = await prisma.candidateSubscription.findUnique({ where: { candidateId } });
    if (existing && existing.plan === 'pro' && (existing.status === 'active' || existing.status === 'trialing')) {
        throw new Error('Candidate already has an active pro subscription');
    }

    const session = await billingProvider.createCheckoutSession({ candidateId, email, trialDays: 14 });

    await prisma.candidateSubscription.upsert({
        where: { candidateId },
        create: {
            candidateId,
            plan: 'free',
            status: 'active',
            provider: 'stripe',
        },
        update: {
            provider: 'stripe',
        },
    });

    return session;
}

async function resolveCheckoutSession({ billingProvider, prisma, sessionId }) {
    const session = await billingProvider.retrieveCheckoutSession(sessionId);
    if (!session) throw new Error('Checkout session not found');

    const candidateId = session.metadata?.candidateId;
    if (!candidateId) throw new Error('No candidateId in checkout session metadata');

    const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
    if (!candidate) throw new Error('Candidate not found');

    const subscription = await prisma.candidateSubscription.findUnique({ where: { candidateId } });

    return {
        sessionId: session.id,
        status: session.status,
        candidateId,
        email: session.customer_email || session.customer_details?.email,
        subscription: subscription ? { plan: subscription.plan, status: subscription.status } : null,
        paymentStatus: session.payment_status,
        subscriptionId: session.subscription,
    };
}

module.exports = { createCheckoutSession, resolveCheckoutSession, PLAN_PRICES };
