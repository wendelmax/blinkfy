const Stripe = require('stripe');

function createStripeAdapter({ secretKey, webhookSecret, proPriceId, successUrl, cancelUrl } = {}) {
    const key = secretKey || process.env.STRIPE_SECRET_KEY;
    const whSecret = webhookSecret || process.env.STRIPE_WEBHOOK_SECRET;
    const priceId = proPriceId || process.env.STRIPE_PRO_PRICE_ID;

    if (!key) throw new Error('STRIPE_SECRET_KEY is required');
    const stripe = new Stripe(key, { apiVersion: '2025-07-30.basil' });

    return {
        provider: 'stripe',

        async createCheckoutSession({ candidateId, email, trialDays = 14 }) {
            const success = successUrl || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/talent/billing/success`;
            const cancel = cancelUrl || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/talent/billing/cancel`;

            const params = {
                mode: 'subscription',
                customer_email: email,
                'line_items[0][price]': priceId,
                'line_items[0][quantity]': 1,
                success_url: `${success}?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: cancel,
                metadata: { candidateId },
                subscription_data: {
                    metadata: { candidateId },
                },
            };

            if (trialDays > 0) {
                params.subscription_data.trial_period_days = trialDays;
            }

            const session = await stripe.checkout.sessions.create(params);
            return {
                sessionId: session.id,
                url: session.url,
                expiresAt: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
            };
        },

        async constructWebhookEvent(payload, signature) {
            if (!whSecret) throw new Error('STRIPE_WEBHOOK_SECRET is required');
            return stripe.webhooks.constructEvent(payload, signature, whSecret);
        },

        async createPortalSession({ stripeCustomerId, returnUrl }) {
            const portalReturnUrl = returnUrl || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/talent`;
            if (!stripeCustomerId) throw new Error('Stripe customer ID is required for portal session');
            const session = await stripe.billingPortal.sessions.create({
                customer: stripeCustomerId,
                return_url: portalReturnUrl,
            });
            return { url: session.url };
        },

        async retrieveSubscription(stripeSubscriptionId) {
            if (!stripeSubscriptionId) return null;
            return stripe.subscriptions.retrieve(stripeSubscriptionId);
        },

        async retrieveCheckoutSession(sessionId) {
            if (!sessionId) return null;
            return stripe.checkout.sessions.retrieve(sessionId);
        },

        async cancelSubscription(stripeSubscriptionId) {
            if (!stripeSubscriptionId) throw new Error('Stripe subscription ID is required');
            return stripe.subscriptions.cancel(stripeSubscriptionId);
        },

        async createCustomer({ email, name, candidateId }) {
            const customer = await stripe.customers.create({
                email,
                name,
                metadata: { candidateId },
            });
            return { id: customer.id };
        },

        rawStripe() { return stripe; },
    };
}

module.exports = { createStripeAdapter };
