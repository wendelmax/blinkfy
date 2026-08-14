const TOOLS = [
  { id: 'candidate.search', description: 'Search authorized candidate records', scopes: ['candidate:read'], approvalRequired: true },
  { id: 'application.preview_ats_export', description: 'Build an ATS export preview', scopes: ['application:read'], approvalRequired: true },
  { id: 'application.preview_crm_export', description: 'Build a CRM export preview', scopes: ['application:read'], approvalRequired: true },
  { id: 'calendar.suggest_slots', description: 'Suggest slots within a client policy', scopes: ['calendar:read'], approvalRequired: true },
];

function buildMcpManifest() { return { protocol: 'mcp', version: '1.0', tools: TOOLS.map((tool) => ({ ...tool, enabled: false, transmitted: false })) }; }

module.exports = { TOOLS, buildMcpManifest };
