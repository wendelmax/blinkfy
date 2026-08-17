const SUPPORTED_PROVIDERS = new Set(['stripe']);

function createBillingProviderRegistry() {
    const adapters = new Map();
    return {
        register({ provider, adapter }) {
            if (!SUPPORTED_PROVIDERS.has(provider)) throw new Error(`Unsupported billing provider: ${provider}`);
            if (!adapter || typeof adapter.createCheckoutSession !== 'function' || typeof adapter.constructWebhookEvent !== 'function' || typeof adapter.createPortalSession !== 'function') {
                throw new Error('Billing adapters must implement createCheckoutSession, constructWebhookEvent, and createPortalSession');
            }
            adapters.set(provider, Object.freeze({ adapter }));
        },
        get(provider) {
            const registered = adapters.get(provider);
            if (!registered) throw new Error(`No billing adapter registered for ${provider}`);
            return registered.adapter;
        },
        providers() { return [...adapters.keys()]; },
    };
}

module.exports = { createBillingProviderRegistry, SUPPORTED_PROVIDERS };
