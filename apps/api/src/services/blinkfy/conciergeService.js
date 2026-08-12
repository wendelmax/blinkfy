const MAX_FOLLOW_UPS = 5;
function validateFollowUpConfig(input = {}) {
  const delays = Array.isArray(input.delaysInDays) ? input.delaysInDays : [];
  if (delays.length > MAX_FOLLOW_UPS) throw new Error(`delaysInDays must contain at most ${MAX_FOLLOW_UPS} items`);
  if (delays.some((delay) => !Number.isInteger(delay) || delay < 1 || delay > 30)) throw new Error('delaysInDays must contain whole days between 1 and 30');
  for (let index = 1; index < delays.length; index += 1) if (delays[index] <= delays[index - 1]) throw new Error('delaysInDays must be strictly increasing');
  return { enabled: input.enabled !== false, delaysInDays: delays };
}
function buildFollowUpPlan({ now = new Date(), lastInboundAt, config = {} } = {}) {
  const normalized = validateFollowUpConfig(config);
  if (!normalized.enabled || lastInboundAt) return [];
  const base = now instanceof Date ? now : new Date(now);
  return normalized.delaysInDays.map((days, index) => ({ sequence: index + 1, scheduledAt: new Date(base.getTime() + days * 24 * 60 * 60 * 1000), requiresApproval: true }));
}
module.exports = { MAX_FOLLOW_UPS, validateFollowUpConfig, buildFollowUpPlan };
