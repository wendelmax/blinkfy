const { buildCrmExportPreview } = require('../../src/services/blinkfy/conciergeCrmExportService');

describe('Concierge CRM export preview', () => {
  it('normalizes a consented application without transmitting it', () => {
    expect(buildCrmExportPreview({ provider: 'hubspot', application: {
      id: 'a1', candidate: { fullName: 'Ada', email: 'ada@example.test' }, job: { title: 'Engineer' }, stage: 'interested', consentRecorded: true,
    } })).toEqual({ provider: 'hubspot', applicationId: 'a1', contact: { fullName: 'Ada', email: 'ada@example.test' }, opportunity: { title: 'Engineer', stage: 'interested' }, approved: false, transmitted: false });
  });

  it('rejects unsupported providers and missing consent', () => {
    expect(() => buildCrmExportPreview({ provider: 'zapier', application: { id: 'a1', consentRecorded: true } })).toThrow('provider');
    expect(() => buildCrmExportPreview({ provider: 'hubspot', application: { id: 'a1', consentRecorded: false } })).toThrow('consent');
  });
});
