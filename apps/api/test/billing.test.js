import { describe, it, expect } from 'vitest';
import { createBillingProviderRegistry, SUPPORTED_PROVIDERS } from '../src/services/blinkfy/billingProviderAdapter.js';
import { mapStripeStatus, STRIPE_STATUS_MAP } from '../src/services/blinkfy/subscriptionLifecycleService.js';

describe('billingProviderAdapter', () => {
    it('creates a registry with register, get, and providers methods', () => {
        const registry = createBillingProviderRegistry();
        expect(typeof registry.register).toBe('function');
        expect(typeof registry.get).toBe('function');
        expect(typeof registry.providers).toBe('function');
        expect(registry.providers()).toEqual([]);
    });

    it('registers and retrieves a valid adapter', () => {
        const registry = createBillingProviderRegistry();
        const adapter = { createCheckoutSession: () => {}, constructWebhookEvent: () => {}, createPortalSession: () => {} };
        registry.register({ provider: 'stripe', adapter });
        expect(registry.get('stripe')).toBe(adapter);
        expect(registry.providers()).toEqual(['stripe']);
    });

    it('throws for unsupported provider', () => {
        const registry = createBillingProviderRegistry();
        expect(() => registry.register({ provider: 'paypal', adapter: {} })).toThrow('Unsupported billing provider');
    });

    it('throws for adapter missing required methods', () => {
        const registry = createBillingProviderRegistry();
        expect(() => registry.register({ provider: 'stripe', adapter: {} })).toThrow('must implement');
        expect(() => registry.register({ provider: 'stripe', adapter: { createCheckoutSession: () => {} } })).toThrow('must implement');
    });

    it('throws when getting unregistered provider', () => {
        const registry = createBillingProviderRegistry();
        expect(() => registry.get('stripe')).toThrow('No billing adapter registered');
    });

    it('SUPPORTED_PROVIDERS contains stripe', () => {
        expect(SUPPORTED_PROVIDERS.has('stripe')).toBe(true);
    });
});

describe('subscriptionLifecycleService mapStripeStatus', () => {
    it('maps active to active', () => {
        expect(mapStripeStatus('active')).toBe('active');
    });

    it('maps trialing to trialing', () => {
        expect(mapStripeStatus('trialing')).toBe('trialing');
    });

    it('maps past_due to past_due', () => {
        expect(mapStripeStatus('past_due')).toBe('past_due');
    });

    it('maps canceled to canceled', () => {
        expect(mapStripeStatus('canceled')).toBe('canceled');
    });

    it('maps incomplete_expired to expired', () => {
        expect(mapStripeStatus('incomplete_expired')).toBe('expired');
    });

    it('maps incomplete to active', () => {
        expect(mapStripeStatus('incomplete')).toBe('active');
    });

    it('maps unpaid to past_due', () => {
        expect(mapStripeStatus('unpaid')).toBe('past_due');
    });

    it('maps paused to past_due', () => {
        expect(mapStripeStatus('paused')).toBe('past_due');
    });

    it('defaults unknown status to active', () => {
        expect(mapStripeStatus('something_weird')).toBe('active');
    });

    it('has expected mappings', () => {
        expect(STRIPE_STATUS_MAP).toHaveProperty('active');
        expect(STRIPE_STATUS_MAP).toHaveProperty('trialing');
        expect(STRIPE_STATUS_MAP).toHaveProperty('past_due');
        expect(STRIPE_STATUS_MAP).toHaveProperty('canceled');
        expect(Object.keys(STRIPE_STATUS_MAP).length).toBeGreaterThanOrEqual(5);
    });
});

describe('stripeBillingAdapter', () => {
    it('throws if STRIPE_SECRET_KEY is not set', async () => {
        const { createStripeAdapter } = await import('../src/services/blinkfy/stripeBillingAdapter.js');
        expect(() => createStripeAdapter({ secretKey: '' })).toThrow('STRIPE_SECRET_KEY is required');
    });

    it('creates adapter with all required methods when key is provided', async () => {
        const { createStripeAdapter } = await import('../src/services/blinkfy/stripeBillingAdapter.js');
        const adapter = createStripeAdapter({ secretKey: 'sk_test_fake', webhookSecret: 'whsec_test', proPriceId: 'price_test' });
        expect(typeof adapter.createCheckoutSession).toBe('function');
        expect(typeof adapter.constructWebhookEvent).toBe('function');
        expect(typeof adapter.createPortalSession).toBe('function');
        expect(typeof adapter.retrieveSubscription).toBe('function');
        expect(typeof adapter.retrieveCheckoutSession).toBe('function');
        expect(typeof adapter.cancelSubscription).toBe('function');
        expect(typeof adapter.createCustomer).toBe('function');
        expect(adapter.provider).toBe('stripe');
    });
});

describe('checkoutSessionService', () => {
    it('exports createCheckoutSession and resolveCheckoutSession functions', async () => {
        const { createCheckoutSession, resolveCheckoutSession, PLAN_PRICES } = await import('../src/services/blinkfy/checkoutSessionService.js');
        expect(typeof createCheckoutSession).toBe('function');
        expect(typeof resolveCheckoutSession).toBe('function');
        expect(PLAN_PRICES).toHaveProperty('pro');
    });

    it('rejects if candidate already has active pro subscription', async () => {
        const { createCheckoutSession } = await import('../src/services/blinkfy/checkoutSessionService.js');
        const mockPrisma = {
            candidateSubscription: {
                findUnique: async () => ({ plan: 'pro', status: 'active' }),
            },
        };
        await expect(createCheckoutSession({ billingProvider: {}, prisma: mockPrisma, candidateId: 'c1', email: 'test@test.com' }))
            .rejects.toThrow('already has an active pro subscription');
    });
});

describe('processWebhookEvent', () => {
    it('returns handled:false for no object', async () => {
        const { processWebhookEvent } = await import('../src/services/blinkfy/stripeWebhookService.js');
        const result = await processWebhookEvent({ prisma: {}, eventType: 'checkout.session.completed', data: null });
        expect(result.handled).toBe(false);
        expect(result.reason).toBe('no_object');
    });

    it('returns handled:false for unhandled event type', async () => {
        const { processWebhookEvent } = await import('../src/services/blinkfy/stripeWebhookService.js');
        const result = await processWebhookEvent({ prisma: {}, eventType: 'charge.succeeded', data: { object: {} } });
        expect(result.handled).toBe(false);
        expect(result.reason).toBe('unhandled_event_type');
    });

    it('returns handled:false for checkout with no candidateId', async () => {
        const { processWebhookEvent } = await import('../src/services/blinkfy/stripeWebhookService.js');
        const result = await processWebhookEvent({ prisma: {}, eventType: 'checkout.session.completed', data: { object: { id: 'cs_1', metadata: {} } } });
        expect(result.handled).toBe(false);
        expect(result.reason).toBe('no_candidate_id');
    });

    it('handles checkout.session.completed with candidateId', async () => {
        const { processWebhookEvent } = await import('../src/services/blinkfy/stripeWebhookService.js');
        const upserted = [];
        const mockPrisma = {
            candidateSubscription: {
                upsert: async (args) => { upserted.push(args); return args; },
            },
        };
        const result = await processWebhookEvent({
            prisma: mockPrisma,
            eventType: 'checkout.session.completed',
            data: { object: { id: 'cs_1', metadata: { candidateId: 'cand1' }, customer: 'cus_1', subscription: 'sub_1' } },
        });
        expect(result.handled).toBe(true);
        expect(result.action).toBe('activated');
        expect(upserted).toHaveLength(1);
        expect(upserted[0].where.candidateId).toBe('cand1');
    });

    it('handles customer.subscription.deleted', async () => {
        const { processWebhookEvent } = await import('../src/services/blinkfy/stripeWebhookService.js');
        const updated = [];
        const mockPrisma = {
            candidateSubscription: {
                findUnique: async () => ({ id: 'sub1', candidateId: 'cand1', status: 'active' }),
                update: async (args) => { updated.push(args); return args; },
            },
        };
        const result = await processWebhookEvent({
            prisma: mockPrisma,
            eventType: 'customer.subscription.deleted',
            data: { object: { id: 'sub_1', metadata: { candidateId: 'cand1' } } },
        });
        expect(result.handled).toBe(true);
        expect(result.action).toBe('canceled');
        expect(updated[0].data.status).toBe('canceled');
    });

    it('handles customer.subscription.updated', async () => {
        const { processWebhookEvent } = await import('../src/services/blinkfy/stripeWebhookService.js');
        const updated = [];
        const mockPrisma = {
            candidateSubscription: {
                findUnique: async () => ({ id: 'sub1', candidateId: 'cand1', status: 'trialing' }),
                update: async (args) => { updated.push(args); return args; },
            },
        };
        const result = await processWebhookEvent({
            prisma: mockPrisma,
            eventType: 'customer.subscription.updated',
            data: { object: { id: 'sub_1', metadata: { candidateId: 'cand1' }, status: 'past_due', current_period_start: 1700000000, current_period_end: 1700300000 } },
        });
        expect(result.handled).toBe(true);
        expect(result.action).toBe('synced');
        expect(updated[0].data.status).toBe('past_due');
    });

    it('handles invoice.payment_succeeded', async () => {
        const { processWebhookEvent } = await import('../src/services/blinkfy/stripeWebhookService.js');
        const updated = [];
        const mockPrisma = {
            candidateSubscription: {
                findFirst: async () => ({ id: 'sub1', candidateId: 'cand1', status: 'past_due' }),
                findUnique: async () => ({ id: 'sub1', candidateId: 'cand1', status: 'past_due' }),
                update: async (args) => { updated.push(args); return args; },
            },
        };
        const result = await processWebhookEvent({
            prisma: mockPrisma,
            eventType: 'invoice.payment_succeeded',
            data: { object: { id: 'inv_1', subscription: 'sub_1', period_start: 1700000000, period_end: 1700300000 } },
        });
        expect(result.handled).toBe(true);
        expect(result.action).toBe('payment_confirmed');
        expect(updated[0].data.status).toBe('active');
    });

    it('handles invoice.payment_failed', async () => {
        const { processWebhookEvent } = await import('../src/services/blinkfy/stripeWebhookService.js');
        const updated = [];
        const mockPrisma = {
            candidateSubscription: {
                findFirst: async () => ({ id: 'sub1', candidateId: 'cand1', status: 'active' }),
                findUnique: async () => ({ id: 'sub1', candidateId: 'cand1', status: 'active' }),
                update: async (args) => { updated.push(args); return args; },
            },
        };
        const result = await processWebhookEvent({
            prisma: mockPrisma,
            eventType: 'invoice.payment_failed',
            data: { object: { id: 'inv_1', subscription: 'sub_1', period_start: 1700000000, period_end: 1700300000 } },
        });
        expect(result.handled).toBe(true);
        expect(result.action).toBe('marked_past_due');
        expect(updated[0].data.status).toBe('past_due');
    });

    it('returns handled:false for subscription webhook with no matching subscription', async () => {
        const { processWebhookEvent } = await import('../src/services/blinkfy/stripeWebhookService.js');
        const mockPrisma = {
            candidateSubscription: {
                findUnique: async () => null,
                findFirst: async () => null,
            },
        };
        const result = await processWebhookEvent({
            prisma: mockPrisma,
            eventType: 'customer.subscription.updated',
            data: { object: { id: 'sub_unknown', metadata: {}, status: 'active' } },
        });
        expect(result.handled).toBe(false);
        expect(result.reason).toBe('no_matching_subscription');
    });
});

describe('stripeWebhookService HANDLED_EVENTS', () => {
    it('includes all expected event types', async () => {
        const { HANDLED_EVENTS } = await import('../src/services/blinkfy/stripeWebhookService.js');
        expect(HANDLED_EVENTS.has('checkout.session.completed')).toBe(true);
        expect(HANDLED_EVENTS.has('customer.subscription.created')).toBe(true);
        expect(HANDLED_EVENTS.has('customer.subscription.updated')).toBe(true);
        expect(HANDLED_EVENTS.has('customer.subscription.deleted')).toBe(true);
        expect(HANDLED_EVENTS.has('invoice.payment_succeeded')).toBe(true);
        expect(HANDLED_EVENTS.has('invoice.payment_failed')).toBe(true);
    });
});
