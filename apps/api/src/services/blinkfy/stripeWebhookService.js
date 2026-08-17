const { logger } = require('../../lib/logger');
const { activateSubscription, syncSubscriptionStatus, cancelSubscription, expireSubscription, getSubscriptionByCandidateId, getSubscriptionByStripeId } = require('./subscriptionLifecycleService');

const HANDLED_EVENTS = new Set([
    'checkout.session.completed',
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'invoice.payment_succeeded',
    'invoice.payment_failed',
]);

async function handleCheckoutCompleted({ prisma, session }) {
    const candidateId = session.metadata?.candidateId;
    if (!candidateId) {
        logger.warn('stripe_webhook.checkout_no_candidate', { sessionId: session.id });
        return { handled: false, reason: 'no_candidate_id' };
    }

    const stripeCustomerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
    const stripeSubscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;

    await activateSubscription({
        prisma,
        candidateId,
        stripeCustomerId,
        stripeSubscriptionId,
        stripeStatus: 'active',
        currentPeriodStart: session.subscription_details?.trial_start || Math.floor(Date.now() / 1000),
        currentPeriodEnd: session.subscription_details?.trial_end || null,
        trialEnd: session.subscription_details?.trial_end || null,
    });

    logger.info('stripe_webhook.checkout_completed', { candidateId, sessionId: session.id });
    return { handled: true, action: 'activated' };
}

async function handleSubscriptionUpdated({ prisma, subscription }) {
    const candidateId = subscription.metadata?.candidateId;
    let sub = null;

    if (candidateId) {
        sub = await syncSubscriptionStatus({
            prisma,
            candidateId,
            stripeStatus: subscription.status,
            currentPeriodStart: subscription.current_period_start,
            currentPeriodEnd: subscription.current_period_end,
        });
    } else {
        sub = await getSubscriptionByStripeId({ prisma, stripeSubscriptionId: subscription.id });
        if (sub) {
            sub = await syncSubscriptionStatus({
                prisma,
                candidateId: sub.candidateId,
                stripeStatus: subscription.status,
                currentPeriodStart: subscription.current_period_start,
                currentPeriodEnd: subscription.current_period_end,
            });
        }
    }

    if (!sub) {
        logger.warn('stripe_webhook.subscription_updated_no_match', { stripeSubscriptionId: subscription.id });
        return { handled: false, reason: 'no_matching_subscription' };
    }

    logger.info('stripe_webhook.subscription_updated', { candidateId: sub.candidateId, status: subscription.status });
    return { handled: true, action: 'synced', status: subscription.status };
}

async function handleSubscriptionDeleted({ prisma, subscription }) {
    const candidateId = subscription.metadata?.candidateId;
    let sub = null;

    if (candidateId) {
        sub = await cancelSubscription({ prisma, candidateId });
    } else {
        sub = await getSubscriptionByStripeId({ prisma, stripeSubscriptionId: subscription.id });
        if (sub) sub = await cancelSubscription({ prisma, candidateId: sub.candidateId });
    }

    if (!sub) {
        logger.warn('stripe_webhook.subscription_deleted_no_match', { stripeSubscriptionId: subscription.id });
        return { handled: false, reason: 'no_matching_subscription' };
    }

    logger.info('stripe_webhook.subscription_deleted', { candidateId: sub.candidateId });
    return { handled: true, action: 'canceled' };
}

async function handleInvoicePaymentSucceeded({ prisma, invoice }) {
    const stripeSubscriptionId = invoice.subscription;
    if (!stripeSubscriptionId) return { handled: false, reason: 'no_subscription' };

    const sub = await getSubscriptionByStripeId({ prisma, stripeSubscriptionId });
    if (!sub) return { handled: false, reason: 'no_matching_subscription' };

    if (sub.status !== 'active') {
        await syncSubscriptionStatus({
            prisma,
            candidateId: sub.candidateId,
            stripeStatus: 'active',
            currentPeriodStart: invoice.period_start,
            currentPeriodEnd: invoice.period_end,
        });
    }

    logger.info('stripe_webhook.invoice_paid', { candidateId: sub.candidateId, invoiceId: invoice.id });
    return { handled: true, action: 'payment_confirmed' };
}

async function handleInvoicePaymentFailed({ prisma, invoice }) {
    const stripeSubscriptionId = invoice.subscription;
    if (!stripeSubscriptionId) return { handled: false, reason: 'no_subscription' };

    const sub = await getSubscriptionByStripeId({ prisma, stripeSubscriptionId });
    if (!sub) return { handled: false, reason: 'no_matching_subscription' };

    await syncSubscriptionStatus({
        prisma,
        candidateId: sub.candidateId,
        stripeStatus: 'past_due',
        currentPeriodStart: invoice.period_start,
        currentPeriodEnd: invoice.period_end,
    });

    logger.info('stripe_webhook.invoice_payment_failed', { candidateId: sub.candidateId, invoiceId: invoice.id });
    return { handled: true, action: 'marked_past_due' };
}

async function processWebhookEvent({ prisma, eventType, data }) {
    const object = data?.object;
    if (!object) return { handled: false, reason: 'no_object' };

    switch (eventType) {
        case 'checkout.session.completed':
            return handleCheckoutCompleted({ prisma, session: object });
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
            return handleSubscriptionUpdated({ prisma, subscription: object });
        case 'customer.subscription.deleted':
            return handleSubscriptionDeleted({ prisma, subscription: object });
        case 'invoice.payment_succeeded':
            return handleInvoicePaymentSucceeded({ prisma, invoice: object });
        case 'invoice.payment_failed':
            return handleInvoicePaymentFailed({ prisma, invoice: object });
        default:
            return { handled: false, reason: 'unhandled_event_type' };
    }
}

module.exports = { processWebhookEvent, HANDLED_EVENTS };
