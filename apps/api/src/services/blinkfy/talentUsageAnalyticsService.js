const { usageLimitFor } = require('./talentUsageService');
const { getCandidateEntitlements } = require('./talentEntitlementsService');

const TRACKED_FEATURES = ['content.draft', 'comment.draft'];

function buildTalentUsageAnalytics({ subscription, usage = [], drafts = [] } = {}) {
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
    drafts: buildDraftAnalytics({ drafts }),
  };
}

function buildDraftAnalytics({ drafts = [] } = {}) {
  const byStatus = { pending: 0, approved: 0, rejected: 0 };
  const byKind = {};
  for (const draft of drafts) {
    if (Object.prototype.hasOwnProperty.call(byStatus, draft.status)) byStatus[draft.status] += 1;
    const kind = typeof draft.kind === 'string' && draft.kind ? draft.kind : 'unknown';
    byKind[kind] = (byKind[kind] || 0) + 1;
  }
  return { total: drafts.length, byStatus, byKind };
}

module.exports = { TRACKED_FEATURES, buildTalentUsageAnalytics, buildDraftAnalytics };
