const { validateRecruiterFeedback } = require('../../src/services/blinkfy/conciergeFeedbackService');

describe('concierge recruiter feedback', () => {
  test('normalizes structured feedback', () => {
    expect(validateRecruiterFeedback({ status: ' Positive ', note: 'Strong communication.' })).toEqual({ status: 'positive', note: 'Strong communication.', requiresHumanReview: false });
  });
  test('requires a note and flags review status', () => {
    expect(validateRecruiterFeedback({ status: 'needs_review', note: 'Check salary alignment.' }).requiresHumanReview).toBe(true);
    expect(() => validateRecruiterFeedback({ status: 'positive', note: '' })).toThrow('note');
  });
});
