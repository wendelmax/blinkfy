const { buildAtsExportPreview } = require('../../src/services/blinkfy/conciergeAtsExportService');
describe('Concierge ATS export preview', () => {
  it('normalizes a consented application for an official provider', () => {
    expect(buildAtsExportPreview({ provider: 'greenhouse', application: { id: 'a1', candidate: { fullName: 'Ada', email: 'ada@example.test' }, job: { title: 'Engineer' }, consentRecorded: true } })).toEqual({ provider: 'greenhouse', applicationId: 'a1', candidate: { fullName: 'Ada', email: 'ada@example.test' }, jobTitle: 'Engineer', approved: false, transmitted: false });
  });
  it('rejects unsupported providers or missing consent', () => {
    expect(() => buildAtsExportPreview({ provider: 'scraper', application: { id: 'a1', consentRecorded: true } })).toThrow('provider');
    expect(() => buildAtsExportPreview({ provider: 'greenhouse', application: { id: 'a1', consentRecorded: false } })).toThrow('consent');
  });
});
