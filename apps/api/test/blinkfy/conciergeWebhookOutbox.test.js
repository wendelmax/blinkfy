const { buildOutboxRecord } = require('../../src/services/blinkfy/conciergeWebhookOutboxService');
describe('Concierge webhook outbox', () => {
  it('creates an approval-pending, idempotent delivery record', () => {
    expect(buildOutboxRecord({ clientId: 'c1', event: { id: 'evt-1', type: 'candidate.responded' }, signature: 'abc' })).toEqual({ clientId: 'c1', eventId: 'evt-1', eventType: 'candidate.responded', signature: 'abc', status: 'pending_approval' });
  });
});
