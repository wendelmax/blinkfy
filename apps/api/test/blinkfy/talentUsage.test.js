import { describe, expect, it } from 'vitest';
const { usageLimitFor } = await import('../../src/services/blinkfy/talentUsageService.js');

describe('Blinkfy Talent usage limits', () => {
  it('gives Free a bounded monthly draft allowance', () => {
    expect(usageLimitFor('free', 'content.draft')).toBe(2);
  });

  it('gives Pro a larger allowance', () => {
    expect(usageLimitFor('pro', 'content.draft')).toBe(50);
  });

  it('does not allow publication automation through usage entitlements', () => {
    expect(usageLimitFor('pro', 'content.publish')).toBe(0);
  });
});
