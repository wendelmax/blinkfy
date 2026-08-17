const SUPPORTED_NFE_PROVIDERS = new Set(['focus_nfe', 'mock']);

function createNfeProviderRegistry() {
    const adapters = new Map();
    return {
        register({ provider, adapter }) {
            if (!SUPPORTED_NFE_PROVIDERS.has(provider)) throw new Error(`Unsupported NF-e provider: ${provider}`);
            if (!adapter || typeof adapter.emitNfe !== 'function' || typeof adapter.queryNfe !== 'function') {
                throw new Error('NF-e adapters must implement emitNfe and queryNfe');
            }
            adapters.set(provider, Object.freeze({ adapter }));
        },
        get(provider) {
            const registered = adapters.get(provider);
            if (!registered) throw new Error(`No NF-e adapter registered for ${provider}`);
            return registered.adapter;
        },
        providers() { return [...adapters.keys()]; },
    };
}

module.exports = { createNfeProviderRegistry, SUPPORTED_NFE_PROVIDERS };
