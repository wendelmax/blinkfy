import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { buildUpgradeIntent } = require('../../src/services/blinkfy/talentUpgradeService');

describe('Talent Pro upgrade intent', () => {
  it('creates a checkout-required intent without charging or changing subscription', () => {
    expect(buildUpgradeIntent({ currentPlan: 'free' })).toEqual({ requestedPlan: 'pro', status: 'pending_checkout', checkoutRequired: true, charged: false, subscriptionChanged: false });
  });
  it('rejects duplicate Pro requests', () => expect(() => buildUpgradeIntent({ currentPlan: 'pro' })).toThrow('already'));
  it('rejects unsupported plans', () => expect(() => buildUpgradeIntent({ currentPlan: 'free', requestedPlan: 'enterprise' })).toThrow('only'));
});
