const { buildMcpToolPreview } = require('../../src/services/blinkfy/mcpToolPreviewService');

describe('Concierge MCP tool preview', () => {
  it('returns a reviewable, non-executing tool envelope', () => {
    expect(buildMcpToolPreview({ toolId: 'calendar.suggest_slots', clientId: 'client-1', arguments: { timezone: 'America/Sao_Paulo' } })).toMatchObject({ tool: 'calendar.suggest_slots', approvalRequired: true, approved: false, executed: false, transmitted: false });
  });
  it('rejects unknown tools and invalid arguments', () => {
    expect(() => buildMcpToolPreview({ toolId: 'shell.exec', clientId: 'client-1' })).toThrow('unsupported');
    expect(() => buildMcpToolPreview({ toolId: 'candidate.search', clientId: 'client-1', arguments: [] })).toThrow('arguments');
  });
});
