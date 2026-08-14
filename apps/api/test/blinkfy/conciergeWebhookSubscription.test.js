const { signWebhookPayload, validateWebhookSubscription } = require('../../src/services/blinkfy/conciergeWebhookSubscriptionService');
describe('Concierge webhook subscriptions', () => {
  it('validates safe destinations and signs payloads', () => {
    expect(validateWebhookSubscription({ url: 'https://hooks.example.test/blinkfy', events: ['candidate.responded'], secret: 'secret-123' })).toEqual({ url: 'https://hooks.example.test/blinkfy', events: ['candidate.responded'], secret: 'secret-123', enabled: true });
    expect(signWebhookPayload({ eventId: 'evt-1', body: { ok: true }, secret: 'secret-123' })).toMatch(/^[a-f0-9]{64}$/);
  });
  it('rejects unsafe URLs and unsupported events', () => {
    expect(() => validateWebhookSubscription({ url: 'http://localhost/hook', events: ['candidate.responded'], secret: 'x' })).toThrow('https');
    expect(() => validateWebhookSubscription({ url: 'https://example.test', events: ['unknown'], secret: 'long-secret' })).toThrow('event');
  });
});
