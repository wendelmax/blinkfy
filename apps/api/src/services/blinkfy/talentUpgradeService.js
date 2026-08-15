function buildUpgradeIntent({ currentPlan = 'free', requestedPlan = 'pro' } = {}) {
  if (currentPlan === 'pro') throw new Error('candidate already has the pro plan');
  if (requestedPlan !== 'pro') throw new Error('only the pro plan can be requested');
  return { requestedPlan: 'pro', status: 'pending_checkout', checkoutRequired: true, charged: false, subscriptionChanged: false };
}

module.exports = { buildUpgradeIntent };
