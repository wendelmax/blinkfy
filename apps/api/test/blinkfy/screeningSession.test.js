import { describe, expect, it } from 'vitest';

const { transitionScreeningSession } = await import('../../src/services/blinkfy/screeningSessionService.js');

describe('screening session state machine', () => {
  it('requires explicit consent before scheduling a screening', () => {
    expect(() => transitionScreeningSession({ status: 'invited', consentedAt: null }, 'scheduled'))
      .toThrow('screening consent required');
  });

  it('allows consented sessions to move through scheduled and completed', () => {
    const consented = transitionScreeningSession(
      { status: 'invited', consentedAt: new Date('2026-08-12T10:00:00Z') },
      'consented',
    );
    expect(consented.status).toBe('consented');

    const scheduled = transitionScreeningSession(consented, 'scheduled');
    expect(scheduled.status).toBe('scheduled');
    const completed = transitionScreeningSession(
      { ...scheduled, status: 'in_progress' },
      'completed',
    );
    expect(completed.status).toBe('completed');
  });

  it('prevents any transition after consent is withdrawn', () => {
    expect(() => transitionScreeningSession({ status: 'withdrawn', consentedAt: null }, 'scheduled'))
      .toThrow('screening session is withdrawn');
  });
});
