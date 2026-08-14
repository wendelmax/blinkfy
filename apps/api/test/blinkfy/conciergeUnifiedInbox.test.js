const { aggregateInboxMessages } = require('../../src/services/blinkfy/conciergeUnifiedInboxService');

describe('Concierge unified inbox', () => {
  it('flattens messages with candidate context newest first', () => {
    const result = aggregateInboxMessages([{ id: 'a1', candidate: { fullName: 'Ada' }, conciergeMessages: [{ id: 'm1', content: 'Hi', receivedAt: new Date('2026-01-02') }] }, { id: 'a2', candidate: { fullName: 'Lin' }, conciergeMessages: [{ id: 'm2', content: 'Hello', receivedAt: new Date('2026-01-03') }] }]);
    expect(result.map((item) => item.id)).toEqual(['m2', 'm1']);
    expect(result[0].candidateName).toBe('Lin');
  });
});
