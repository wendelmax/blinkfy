const { TOOLS } = require('./mcpManifestService');

function buildMcpToolPreview({ toolId, arguments: input = {}, clientId }) {
  const tool = TOOLS.find((item) => item.id === toolId);
  if (!tool) throw new Error('tool is unsupported');
  if (!clientId) throw new Error('clientId is required');
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('arguments must be an object');
  return { protocol: 'mcp', tool: tool.id, clientId, arguments: input, scopes: tool.scopes, approvalRequired: true, approved: false, executed: false, transmitted: false };
}

module.exports = { buildMcpToolPreview };
