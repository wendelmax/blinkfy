const {
    createOfficialIntegrationRegistry,
    createImportRequest,
} = require('../../src/services/blinkfy/officialIntegrationService');

test('registers and invokes an approved official import adapter', async () => {
    const importCandidates = vi.fn().mockResolvedValue({ imported: 2 });
    const registry = createOfficialIntegrationRegistry();
    registry.register({
        provider: 'linkedin',
        adapter: { importCandidates },
        approvalReference: 'partner-contract-1',
    });

    const request = createImportRequest({
        provider: 'linkedin',
        workspaceId: 'workspace-1',
        actorId: 'user-1',
        consentId: 'consent-1',
        source: 'official_api',
        payload: { selectionId: 'selection-1' },
    });
    await expect(registry.import(request)).resolves.toEqual({ imported: 2 });
    expect(importCandidates).toHaveBeenCalledWith(expect.objectContaining({
        source: 'official_api',
        consentId: 'consent-1',
    }));
});

test('rejects unapproved providers and scraping/browser credentials', async () => {
    const registry = createOfficialIntegrationRegistry();
    expect(() => registry.register({ provider: 'linkedin', adapter: {} }))
        .toThrow(/approval/i);
    expect(() => createImportRequest({
        provider: 'linkedin', workspaceId: 'w', actorId: 'u', consentId: 'c',
        source: 'scraper', payload: {},
    })).toThrow(/official/i);
    expect(() => createImportRequest({
        provider: 'linkedin', workspaceId: 'w', actorId: 'u', consentId: 'c',
        source: 'official_api', payload: { password: 'secret' },
    })).toThrow(/credential/i);
});

test('requires consent and keeps adapters isolated behind the import contract', async () => {
    const registry = createOfficialIntegrationRegistry();
    registry.register({
        provider: 'greenhouse',
        adapter: { importCandidates: async () => ({ imported: 0 }) },
        approvalReference: 'ats-contract-1',
    });
    expect(() => createImportRequest({
        provider: 'greenhouse', workspaceId: 'w', actorId: 'u',
        source: 'official_api', payload: {},
    })).toThrow(/consent/i);
    await expect(registry.import(createImportRequest({
        provider: 'greenhouse', workspaceId: 'w', actorId: 'u', consentId: 'c',
        source: 'official_api', payload: {},
    }))).resolves.toEqual({ imported: 0 });
});
