const { summarizeScreening } = require('../../src/services/blinkfy/screeningSummaryService');

describe('screening summary', () => {
  test('marks a consented dossier ready only with transcript and insight', () => {
    expect(summarizeScreening({ session: { status: 'consented', consentedAt: new Date(), consentVersion: 'v1' }, evidences: [{ kind: 'transcript' }, { kind: 'insight' }], score: { score: 84 } })).toMatchObject({ evidenceCount: 2, reviewReady: true, score: 84, requiresHumanReview: true });
  });
  test('prefers reviewer override', () => {
    expect(summarizeScreening({ session: { status: 'completed', consentedAt: new Date(), consentVersion: 'v1' }, evidences: [{ kind: 'transcript' }], score: { score: 70, overrideScore: 90 } })).toMatchObject({ score: 90, reviewReady: false });
  });
});
