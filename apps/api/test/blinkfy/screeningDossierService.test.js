const { validateEvidenceInput, findLatestDossierSession } = require('../../src/services/blinkfy/screeningDossierService');

describe('screening dossier service', () => {
  test('normalizes valid evidence', () => {
    expect(validateEvidenceInput({ kind: 'transcript', content: ' hello ', confidence: 90 })).toMatchObject({ kind: 'transcript', content: 'hello', confidence: 90, uri: null });
  });

  test('rejects missing content and invalid confidence', () => {
    expect(() => validateEvidenceInput({ kind: 'insight' })).toThrow('uri or content is required');
    expect(() => validateEvidenceInput({ kind: 'insight', content: 'x', confidence: 101 })).toThrow('confidence');
  });

  test('selects latest non-withdrawn session with evidence', async () => {
    const findFirst = async (query) => { expect(query.where.status).toEqual({ not: 'withdrawn' }); return { id: 's1', evidences: [] }; };
    await expect(findLatestDossierSession({ prisma: { screeningSession: { findFirst } }, applicationId: 'a1' })).resolves.toEqual({ id: 's1', evidences: [] });
  });
});
