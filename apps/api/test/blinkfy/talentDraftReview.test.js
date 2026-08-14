const { transitionCandidateDraft } = require('../../src/services/blinkfy/talentDraftReviewService');

describe('Talent draft review', () => {
  it('allows a pending draft to be approved or rejected', () => {
    expect(transitionCandidateDraft('pending', 'approved')).toBe('approved');
    expect(transitionCandidateDraft('pending', 'rejected')).toBe('rejected');
  });

  it('does not allow a decided draft to be changed', () => {
    expect(() => transitionCandidateDraft('approved', 'rejected')).toThrow('already decided');
    expect(() => transitionCandidateDraft('pending', 'published')).toThrow('status');
  });
});
