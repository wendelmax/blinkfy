const { buildWebhookEvent } = require('../../src/services/blinkfy/conciergeWebhookService');

describe('concierge webhook contract', () => {
  test('builds a minimal approved event payload', () => {
    expect(buildWebhookEvent({ type: 'candidate.responded', candidateId: 'c1', applicationId: 'a1', occurredAt: '2026-09-01T10:00:00Z' })).toMatchObject({ type: 'candidate.responded', candidateId: 'c1', applicationId: 'a1', externalDelivery: 'approval_required' });
  });
  test('rejects unsupported or incomplete events', () => {
    expect(() => buildWebhookEvent({ type: 'message.sent', candidateId: 'c1', applicationId: 'a1' })).toThrow('unsupported');
    expect(() => buildWebhookEvent({ type: 'candidate.connected', candidateId: 'c1' })).toThrow('required');
  });
});
