const { transitionScreeningSession } = require('../../src/services/blinkfy/screeningSessionService');

describe('screening lifecycle', () => {
    it('allows scheduled sessions to start and in-progress sessions to complete', () => {
        expect(transitionScreeningSession({ status: 'scheduled', consentedAt: new Date() }, 'in_progress').status).toBe('in_progress');
        expect(transitionScreeningSession({ status: 'in_progress', consentedAt: new Date() }, 'completed').status).toBe('completed');
    });

    it('does not allow completion without consent', () => {
        expect(() => transitionScreeningSession({ status: 'in_progress', consentedAt: null }, 'completed')).toThrow('consent required');
    });
});
