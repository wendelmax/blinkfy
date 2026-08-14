const { usageLimitFor } = require('./talentUsageService');
const { getCandidateEntitlements } = require('./talentEntitlementsService');

const TRACKED_FEATURES = ['content.draft', 'comment.draft'];

function buildTalentUsageAnalytics({ subscription, usage = [] } = {}) {
  const plan = subscription?.plan === 'pro' ? 'pro' : 'free';
  const status = subscription?.status || 'inactive';
  const byFeature = new Map(usage.map((item) => [item.feature, item.count]));
  return {
    plan,
    status,
    period: { start: subscription?.currentPeriodStart ?? null, end: subscription?.currentPeriodEnd ?? null },
    usage: TRACKED_FEATURES.map((feature) => {
      const used = byFeature.get(feature) || 0;
      const limit = usageLimitFor(plan, feature);
      return { feature, used, limit, remaining: Math.max(0, limit - used) };
    }),
    entitlements: getCandidateEntitlements(subscription),
  };
}

module.exports = { TRACKED_FEATURES, buildTalentUsageAnalytics };
