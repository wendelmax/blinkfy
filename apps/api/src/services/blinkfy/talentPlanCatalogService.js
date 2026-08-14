const { getCandidateEntitlements } = require('./talentEntitlementsService');
const { usageLimitFor } = require('./talentUsageService');

function buildTalentPlanCatalog({ plan = 'free', status = 'inactive' } = {}) {
    return {
        currentPlan: plan === 'pro' ? 'pro' : 'free',
        status,
        plans: ['free', 'pro'].map((id) => ({
            id,
            limits: { 'content.draft': usageLimitFor(id, 'content.draft'), 'comment.draft': usageLimitFor(id, 'comment.draft') },
            entitlements: getCandidateEntitlements({ plan: id, status: 'active' }),
        })),
    };
}

module.exports = { buildTalentPlanCatalog };
