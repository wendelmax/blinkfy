const FREE_ENTITLEMENTS = [
  'profile.basic', 'profile.discovery', 'profile.analytics.basic', 'export.resume',
];

const PRO_ENTITLEMENTS = [
  ...FREE_ENTITLEMENTS, 'profile.ai_improvement', 'content.draft', 'comment.draft',
  'connection.suggestions', 'network.insights', 'profile.analytics.advanced',
];

function getCandidateEntitlements(subscription) {
  return subscription?.plan === 'pro' && ['active', 'trialing'].includes(subscription.status)
    ? PRO_ENTITLEMENTS
    : FREE_ENTITLEMENTS;
}

module.exports = { getCandidateEntitlements, FREE_ENTITLEMENTS, PRO_ENTITLEMENTS };
