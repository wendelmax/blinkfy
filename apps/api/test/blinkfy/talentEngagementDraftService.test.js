const { buildEngagementDraft } = require('../../src/services/blinkfy/talentEngagementDraftService');

describe('talent engagement drafts', () => {
  test('builds an approval-gated professional post', () => {
    expect(buildEngagementDraft({ topic: 'distributed systems' })).toMatchObject({ format: 'post', topic: 'distributed systems', requiresApproval: true, published: false });
  });
  test('supports comments/connections and rejects empty topics', () => {
    expect(buildEngagementDraft({ topic: 'career growth', format: 'comment' }).content).toContain('career growth');
    expect(() => buildEngagementDraft({ topic: '' })).toThrow('topic');
  });
});
