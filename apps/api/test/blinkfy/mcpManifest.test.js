const { buildMcpManifest } = require('../../src/services/blinkfy/mcpManifestService');

describe('Concierge MCP manifest', () => {
  it('describes approval-gated disabled tools without transmission', () => {
    const manifest = buildMcpManifest();
    expect(manifest.protocol).toBe('mcp');
    expect(manifest.tools.map((tool) => tool.id)).toEqual(expect.arrayContaining(['application.preview_ats_export', 'calendar.suggest_slots']));
    expect(manifest.tools.every((tool) => !tool.enabled && tool.approvalRequired && !tool.transmitted)).toBe(true);
  });
});
