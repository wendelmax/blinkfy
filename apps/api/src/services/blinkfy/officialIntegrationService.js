const PROVIDERS = new Set(['linkedin', 'greenhouse', 'lever', 'workable']);
const FORBIDDEN_SOURCES = new Set(['scraper', 'browser', 'extension', 'manual_credentials']);
const FORBIDDEN_KEYS = new Set(['password', 'username', 'cookie', 'cookies', 'sessionCookie', 'browserProfile', 'proxy']);

function assertSafePayload(value, path = 'payload') {
    if (!value || typeof value !== 'object') return;
    for (const [key, nested] of Object.entries(value)) {
        if (FORBIDDEN_KEYS.has(key)) throw new Error(`Raw credential or browser state is not allowed (${path}.${key})`);
        assertSafePayload(nested, `${path}.${key}`);
    }
}

function createImportRequest({ provider, workspaceId, actorId, consentId, source, payload = {} }) {
    if (!PROVIDERS.has(provider)) throw new Error(`Unsupported integration provider: ${provider}`);
    if (!workspaceId || !actorId) throw new Error('workspaceId and actorId are required');
    if (!consentId) throw new Error('Explicit consent is required for official imports');
    if (source !== 'official_api' && source !== 'approved_partner') {
        throw new Error('Imports must use an official API or approved partner');
    }
    assertSafePayload(payload);
    return Object.freeze({ provider, workspaceId, actorId, consentId, source, payload });
}

function createOfficialIntegrationRegistry() {
    const adapters = new Map();
    return {
        register({ provider, adapter, approvalReference }) {
            if (!PROVIDERS.has(provider)) throw new Error(`Unsupported integration provider: ${provider}`);
            if (!approvalReference) throw new Error('An official approval reference is required');
            if (!adapter || typeof adapter.importCandidates !== 'function') {
                throw new Error('Official adapters must implement importCandidates');
            }
            adapters.set(provider, Object.freeze({ adapter, approvalReference }));
        },
        async import(request) {
            const registered = adapters.get(request.provider);
            if (!registered) throw new Error(`No approved adapter registered for ${request.provider}`);
            return registered.adapter.importCandidates(request);
        },
        providers() { return [...adapters.keys()]; },
    };
}

module.exports = { createOfficialIntegrationRegistry, createImportRequest };
