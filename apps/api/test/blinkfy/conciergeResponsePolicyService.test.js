const { validateSuggestedResponse } = require('../../src/services/blinkfy/conciergeResponsePolicyService');

describe('concierge response policy', () => {
  test('requires approval and disables autonomous sending', () => {
    expect(validateSuggestedResponse({ content: 'Thanks for your interest. A recruiter will follow up.' })).toMatchObject({ requiresApproval: true, autonomousSending: false });
  });
  test('rejects unverified promises', () => {
    expect(() => validateSuggestedResponse({ content: 'We guarantee you will be hired.' })).toThrow('unverified');
  });
});
