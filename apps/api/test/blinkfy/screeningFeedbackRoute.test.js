const { validateRecruiterFeedback } = require('../../src/services/blinkfy/conciergeFeedbackService');

describe('screening feedback contract', () => {
    it('accepts supported human assessments and preserves the review flag', () => {
        expect(validateRecruiterFeedback({ status: 'needs_review', note: 'Validate communication examples.' })).toEqual({ status: 'needs_review', note: 'Validate communication examples.', requiresHumanReview: true });
    });

    it('rejects empty or oversized notes', () => {
        expect(() => validateRecruiterFeedback({ status: 'positive', note: '' })).toThrow('feedback note is required');
        expect(() => validateRecruiterFeedback({ status: 'positive', note: 'x'.repeat(2001) })).toThrow('2000');
    });
});
