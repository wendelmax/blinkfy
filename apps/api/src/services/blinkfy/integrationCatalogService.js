const CATALOG = [
    { id: 'greenhouse', category: 'ats', official: true },
    { id: 'lever', category: 'ats', official: true },
    { id: 'workable', category: 'ats', official: true },
    { id: 'hubspot', category: 'crm', official: true },
    { id: 'salesforce', category: 'crm', official: true },
    { id: 'pipedrive', category: 'crm', official: true },
    { id: 'n8n-mcp', category: 'automation', official: true },
];

function buildIntegrationCatalog() {
    return CATALOG.map((item) => ({ ...item, configured: false, requiresApproval: true, transmitted: false }));
}

module.exports = { CATALOG, buildIntegrationCatalog };
