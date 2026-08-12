const { findExpiredEvidence } = require('../../src/services/blinkfy/screeningRetentionService');

describe('screening evidence retention', () => {
  test('identifies only evidence past its retention deadline', () => {
    expect(findExpiredEvidence([{ id: 'old', retentionUntil: '2026-08-01T00:00:00Z' }, { id: 'new', retentionUntil: '2026-09-01T00:00:00Z' }], new Date('2026-08-15T00:00:00Z'))).toEqual(['old']);
  });
  test('ignores evidence without a retention deadline', () => {
    expect(findExpiredEvidence([{ id: 'permanent', retentionUntil: null }], new Date())).toEqual([]);
  });
});
