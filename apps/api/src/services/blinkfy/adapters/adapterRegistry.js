const { CalendarAdapter } = require('./calendarAdapter');
const { AtsAdapter } = require('./atsAdapter');
const { McpAdapter } = require('./mcpAdapter');

const adapterRegistry = {
    google_calendar: CalendarAdapter,
    slack_calendar: CalendarAdapter,
    greenhouse: AtsAdapter,
    lever: AtsAdapter,
    workable: AtsAdapter,
    hubspot: AtsAdapter,
    salesforce: AtsAdapter,
    mcp: McpAdapter,
};

function createAdapter(provider, config = {}) {
    const AdapterClass = adapterRegistry[provider];
    if (!AdapterClass) {
        throw new Error(`Unknown integration provider: "${provider}". Supported: ${Object.keys(adapterRegistry).join(', ')}`);
    }
    return new AdapterClass({ ...config, provider });
}

function getSupportedProviders() {
    return Object.keys(adapterRegistry).map(provider => {
        const AdapterClass = adapterRegistry[provider];
        const temp = new AdapterClass({ provider });
        return { provider, category: temp.category };
    });
}

module.exports = { createAdapter, getSupportedProviders, adapterRegistry };
