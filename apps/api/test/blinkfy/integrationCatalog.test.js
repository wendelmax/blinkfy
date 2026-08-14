const { buildIntegrationCatalog } = require('../../src/services/blinkfy/integrationCatalogService');

describe('Concierge integration catalog', () => {
    it('lists official connectors without credentials or transmission', () => {
        const result = buildIntegrationCatalog();
        expect(result.map((item) => item.id)).toEqual(expect.arrayContaining(['greenhouse', 'hubspot', 'n8n-mcp']));
        expect(result.every((item) => item.requiresApproval && !item.configured && !item.transmitted)).toBe(true);
    });
});
