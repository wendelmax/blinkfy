const { transitionOutboxReview } = require('../../src/services/blinkfy/conciergeWebhookOutboxService');

describe('Concierge webhook outbox review', () => {
  it('allows pending deliveries to be approved or rejected', () => {
    expect(transitionOutboxReview('pending_approval', 'approved')).toBe('approved');
    expect(transitionOutboxReview('pending_approval', 'rejected')).toBe('rejected');
  });
  it('does not allow a decided delivery to change', () => {
    expect(() => transitionOutboxReview('approved', 'rejected')).toThrow('already decided');
    expect(() => transitionOutboxReview('pending_approval', 'sent')).toThrow('status');
  });
});
