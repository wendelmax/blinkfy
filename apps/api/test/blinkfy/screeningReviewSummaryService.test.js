const { buildReviewSummary } = require('../../src/services/blinkfy/screeningReviewSummaryService');

describe('screening review summary', () => {
  test('summarizes evidence coverage and keeps human review required', () => {
    expect(buildReviewSummary({ evidences: [{ kind: 'transcript' }, { kind: 'insight' }], score: { score: 82 } })).toEqual({ evidenceCount: 2, hasTranscript: true, hasRecording: false, hasInsight: true, score: 82, requiresHumanReview: true, automatedDecision: null });
  });
  test('prefers reviewer override and never makes an automated decision', () => {
    expect(buildReviewSummary({ score: { score: 70, overrideScore: 88 } })).toMatchObject({ score: 88, requiresHumanReview: true, automatedDecision: null });
  });
});
