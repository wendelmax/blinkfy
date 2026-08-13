const { transitionScreeningSession } = require('../../src/services/blinkfy/screeningSessionService');
describe('candidate-owned screening consent', () => {
    it('allows consent only from an invited session', () => { expect(transitionScreeningSession({ status: 'invited', consentedAt: null }, 'consented').status).toBe('consented'); });
    it('rejects consent after withdrawal', () => { expect(() => transitionScreeningSession({ status: 'withdrawn', consentedAt: null }, 'consented')).toThrow('withdrawn'); });
});
