import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { buildCalendarPreview, suggestSlots, validateApprovalRequest } = require('../../src/services/blinkfy/conciergeSchedulingService');

describe('concierge calendar preview', () => {
  it('returns at most three approval-only slots', () => {
    const preview = buildCalendarPreview({ policy: { timezone: 'America/Sao_Paulo', windows: [
      { start: '2026-08-17T13:00:00.000Z', end: '2026-08-17T13:30:00.000Z' },
      { start: '2026-08-18T15:00:00.000Z', end: '2026-08-18T15:30:00.000Z' },
      { start: '2026-08-19T16:00:00.000Z', end: '2026-08-19T16:30:00.000Z' },
      { start: '2026-08-20T14:00:00.000Z', end: '2026-08-20T14:30:00.000Z' },
    ] } });
    expect(preview.timezone).toBe('America/Sao_Paulo');
    expect(preview.slots).toHaveLength(3);
    expect(preview.slots.every((slot) => slot.requiresApproval && !slot.scheduled && !slot.transmitted)).toBe(true);
    expect(preview.scheduled).toBe(false);
    expect(preview.transmitted).toBe(false);
  });
  it('returns an empty safe preview when no policy exists', () => expect(buildCalendarPreview({ policy: null })).toEqual({ timezone: null, slots: [], requiresApproval: true, scheduled: false, transmitted: false }));
  it('does not leak extra candidate fields into a preview', () => expect(suggestSlots({ candidates: [{ start: 'a', end: 'b', secret: 'no' }] })).toEqual([{ start: 'a', end: 'b', requiresApproval: true, scheduled: false, transmitted: false }]));
  it('accepts approval only for a slot contained in a configured window', () => {
    expect(validateApprovalRequest({ policy: { windows: [{ start: '2026-08-20T14:00:00.000Z', end: '2026-08-20T15:00:00.000Z' }] }, start: '2026-08-20T14:15:00.000Z', end: '2026-08-20T14:45:00.000Z' })).toEqual({ start: '2026-08-20T14:15:00.000Z', end: '2026-08-20T14:45:00.000Z' });
  });
  it('rejects approval outside configured windows', () => {
    expect(() => validateApprovalRequest({ policy: { windows: [{ start: '2026-08-20T14:00:00.000Z', end: '2026-08-20T15:00:00.000Z' }] }, start: '2026-08-20T15:00:00.000Z', end: '2026-08-20T15:30:00.000Z' })).toThrow('outside');
  });
});
