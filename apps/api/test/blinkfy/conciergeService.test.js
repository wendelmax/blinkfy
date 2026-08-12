const { buildFollowUpPlan, validateFollowUpConfig } = require('../../src/services/blinkfy/conciergeService');
describe('concierge follow-up policy', () => {
  test('normalizes an approved, increasing schedule', () => { expect(validateFollowUpConfig({ delaysInDays: [1, 3, 7] })).toEqual({ enabled: true, delaysInDays: [1, 3, 7] }); });
  test('rejects unsafe schedules', () => { expect(() => validateFollowUpConfig({ delaysInDays: [3, 2] })).toThrow('strictly increasing'); expect(() => validateFollowUpConfig({ delaysInDays: [0] })).toThrow('between 1 and 30'); });
  test('stops after inbound and requires approval', () => { const now = new Date('2026-08-12T12:00:00.000Z'); expect(buildFollowUpPlan({ now, config: { delaysInDays: [1, 3] } })).toEqual([{ sequence: 1, scheduledAt: new Date('2026-08-13T12:00:00.000Z'), requiresApproval: true }, { sequence: 2, scheduledAt: new Date('2026-08-15T12:00:00.000Z'), requiresApproval: true }]); expect(buildFollowUpPlan({ now, lastInboundAt: now, config: { delaysInDays: [1] } })).toEqual([]); });
});
