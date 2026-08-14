const { buildTalentUsageAnalytics } = require('../../src/services/blinkfy/talentUsageAnalyticsService');

describe('Talent usage analytics', () => {
  it('returns plan, period usage, remaining quotas, and entitlements', () => {
    expect(buildTalentUsageAnalytics({
      subscription: { plan: 'free', status: 'active', currentPeriodStart: '2026-08-01T00:00:00.000Z', currentPeriodEnd: '2026-09-01T00:00:00.000Z' },
      usage: [{ feature: 'content.draft', count: 1 }, { feature: 'comment.draft', count: 5 }],
    })).toEqual({
      plan: 'free', status: 'active', period: { start: '2026-08-01T00:00:00.000Z', end: '2026-09-01T00:00:00.000Z' },
      usage: [
        { feature: 'content.draft', used: 1, limit: 2, remaining: 1 },
        { feature: 'comment.draft', used: 5, limit: 5, remaining: 0 },
      ],
      entitlements: expect.arrayContaining(['profile.basic', 'profile.analytics.basic']),
    });
  });
});
