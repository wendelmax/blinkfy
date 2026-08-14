const { usageFeatureForDraft, periodKey } = require('../../src/services/blinkfy/talentDraftUsageService');

describe('Talent draft usage mapping', () => {
  it('maps billable draft formats and leaves connection notes to their separate entitlement', () => {
    expect(usageFeatureForDraft('post')).toBe('content.draft');
    expect(usageFeatureForDraft('comment')).toBe('comment.draft');
    expect(usageFeatureForDraft('connection')).toBeNull();
  });

  it('uses a stable monthly period key', () => {
    expect(periodKey(new Date('2026-08-14T12:00:00Z'))).toBe('2026-08');
  });
});
