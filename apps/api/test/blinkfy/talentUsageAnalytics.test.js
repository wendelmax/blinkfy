const { buildTalentUsageAnalytics } = require('../../src/services/blinkfy/talentUsageAnalyticsService');

describe('Talent usage analytics', () => {
  it('returns plan, period usage, remaining quotas, and entitlements', () => {
    expect(buildTalentUsageAnalytics({
      subscription: { plan: 'free', status: 'active', currentPeriodStart: '2026-08-01T00:00:00.000Z', currentPeriodEnd: '2026-09-01T00:00:00.000Z' },
      usage: [{ feature: 'content.draft', count: 1 }, { feature: 'comment.draft', count: 5 }],
      drafts: [{ kind: 'post', status: 'approved' }, { kind: 'comment', status: 'pending' }, { kind: 'comment', status: 'rejected' }],
    })).toEqual({
      plan: 'free', status: 'active', period: { start: '2026-08-01T00:00:00.000Z', end: '2026-09-01T00:00:00.000Z' },
      usage: [
        { feature: 'content.draft', used: 1, limit: 2, remaining: 1 },
        { feature: 'comment.draft', used: 5, limit: 5, remaining: 0 },
      ],
      entitlements: expect.arrayContaining(['profile.basic', 'profile.analytics.basic']),
      drafts: { total: 3, byStatus: { pending: 1, approved: 1, rejected: 1 }, byKind: { post: 1, comment: 2 } },
    });
  });

  it('normalizes unknown draft statuses and kinds without exposing payloads', async () => {
    const { buildDraftAnalytics } = await import('../../src/services/blinkfy/talentUsageAnalyticsService');
    expect(buildDraftAnalytics({ drafts: [{ kind: '', status: 'archived' }, { kind: 'post', status: 'pending' }] })).toEqual({ total: 2, byStatus: { pending: 1, approved: 0, rejected: 0 }, byKind: { unknown: 1, post: 1 } });
  });
});
