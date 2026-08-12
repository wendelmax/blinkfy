const { validateSchedulingPolicy, suggestSlots } = require('../../src/services/blinkfy/conciergeSchedulingService');

describe('concierge scheduling policy', () => {
  test('validates timezone and requires human approval', () => {
    expect(validateSchedulingPolicy({ timezone: 'America/Sao_Paulo', windows: [{ start: '2026-09-01T10:00:00Z', end: '2026-09-01T11:00:00Z' }] })).toMatchObject({ requiresApproval: true, autonomousSending: false });
  });
  test('rejects inverted windows and limits suggestions', () => {
    expect(() => validateSchedulingPolicy({ timezone: 'UTC', windows: [{ start: '2026-09-01T11:00:00Z', end: '2026-09-01T10:00:00Z' }] })).toThrow('positive');
    expect(suggestSlots({ candidates: [1, 2, 3, 4] })).toHaveLength(3);
  });
});
