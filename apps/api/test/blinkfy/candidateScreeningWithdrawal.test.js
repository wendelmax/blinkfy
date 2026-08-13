const { transitionScreeningSession } = require('../../src/services/blinkfy/screeningSessionService');
describe('candidate screening withdrawal', () => {
    it('allows withdrawal from an active consented session', () => { expect(transitionScreeningSession({ status: 'consented', consentedAt: new Date() }, 'withdrawn').status).toBe('withdrawn'); });
    it('does not allow withdrawal after completion', () => { expect(() => transitionScreeningSession({ status: 'completed', consentedAt: new Date() }, 'withdrawn')).toThrow('invalid screening transition'); });
});
