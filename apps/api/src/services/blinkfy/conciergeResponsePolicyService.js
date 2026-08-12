const forbiddenClaims = [/guarantee(?:d)?/i, /definitely hired/i, /we will hire you/i];

function validateSuggestedResponse(input = {}) {
  const content = typeof input.content === 'string' ? input.content.trim() : '';
  if (!content) throw new Error('content is required');
  if (content.length > 5000) throw new Error('content must be 5000 characters or fewer');
  if (forbiddenClaims.some((pattern) => pattern.test(content))) throw new Error('response contains an unverified promise');
  return { content, requiresApproval: true, autonomousSending: false };
}

module.exports = { validateSuggestedResponse };
