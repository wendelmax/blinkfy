import { describe, expect, it } from 'vitest';
const { getCandidateEntitlements } = await import('../../src/services/blinkfy/talentEntitlementsService.js');

describe('Blinkfy Talent entitlements', () => {
  it('grants only the free baseline without a subscription', () => {
    expect(getCandidateEntitlements(null)).toEqual(expect.arrayContaining([
      'profile.basic', 'profile.discovery', 'profile.analytics.basic', 'export.resume',
    ]));
    expect(getCandidateEntitlements(null)).not.toContain('content.draft');
  });

  it('grants Pro features only for an active Pro subscription', () => {
    expect(getCandidateEntitlements({ plan: 'pro', status: 'active' })).toContain('content.draft');
    expect(getCandidateEntitlements({ plan: 'pro', status: 'canceled' })).not.toContain('content.draft');
  });
});
