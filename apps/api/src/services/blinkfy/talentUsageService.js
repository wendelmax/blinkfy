const LIMITS = {
  free: { 'content.draft': 2, 'comment.draft': 5 },
  pro: { 'content.draft': 50, 'comment.draft': 100 },
};

function usageLimitFor(plan, feature) {
  return LIMITS[plan]?.[feature] || 0;
}

async function consumeUsage({ prisma, candidateId, feature, plan, period }) {
  const limit = usageLimitFor(plan, feature);
  if (!limit) throw new Error('feature unavailable');
  const current = await prisma.candidateUsage.findUnique({ where: { candidateId_period_feature: { candidateId, period, feature } } });
  if (current && current.count >= limit) throw new Error('monthly usage limit reached');
  const usage = await prisma.candidateUsage.upsert({
    where: { candidateId_period_feature: { candidateId, period, feature } },
    create: { candidateId, period, feature, count: 1 },
    update: { count: { increment: 1 } },
  });
  return usage;
}

module.exports = { usageLimitFor, consumeUsage };
