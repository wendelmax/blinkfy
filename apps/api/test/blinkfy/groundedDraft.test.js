const { buildGroundedDraft } = require('../../src/services/blinkfy/groundedDraftService');

describe('grounded Concierge drafts', () => {
  it('builds a conservative draft with source grounding', () => {
    const result = buildGroundedDraft({ inboundMessage: { content: 'Is remote work available?', channel: 'linkedin' }, matches: [{ id: 'chunk-1', title: 'Benefits', content: 'Remote work is available.' }] });
    expect(result.channel).toBe('linkedin');
    expect(result.content).toContain('Remote work is available.');
    expect(result.grounding).toEqual([{ chunkId: 'chunk-1', title: 'Benefits' }]);
  });
  it('refuses to draft without grounded context', () => { expect(() => buildGroundedDraft({ inboundMessage: { content: 'Tell me more', channel: 'email' }, matches: [] })).toThrow('NO_GROUNDING_CONTEXT'); });
});
