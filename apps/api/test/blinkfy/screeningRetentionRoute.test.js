const { findExpiredEvidence } = require('../../src/services/blinkfy/screeningRetentionService');

describe('screening dossier retention summary', () => {
    it('identifies evidence whose deadline has passed', () => {
        expect(findExpiredEvidence([{ id: 'old', retentionUntil: '2026-01-01T00:00:00Z' }, { id: 'future', retentionUntil: '2027-01-01T00:00:00Z' }], new Date('2026-08-13T00:00:00Z'))).toEqual(['old']);
    });
});
