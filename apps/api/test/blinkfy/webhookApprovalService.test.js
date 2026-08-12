const { prepareWebhookDispatch } = require('../../src/services/blinkfy/webhookApprovalService');

describe('webhook dispatch approval', () => {
  test('blocks dispatch without matching human approval', () => {
    expect(prepareWebhookDispatch({ id: 'e1', type: 'candidate.responded' })).toEqual({ dispatchable: false, reason: 'human approval required', eventId: 'e1' });
  });
  test('returns a stable idempotency key after approval', () => {
    expect(prepareWebhookDispatch({ id: 'e1', type: 'candidate.responded' }, { eventId: 'e1', approved: true })).toEqual({ dispatchable: true, eventId: 'e1', idempotencyKey: 'blinkfy:e1' });
  });
});
