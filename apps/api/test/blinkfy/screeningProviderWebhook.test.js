const { validateProviderResult, verifyWebhookSecret } = require('../../src/services/blinkfy/screeningProviderWebhookService');
describe('provider-neutral screening webhook', () => {
    it('validates a completed result with required evidence', () => { expect(validateProviderResult({ eventId: 'evt-1', status: 'completed', evidence: { transcript: { content: 'hello' }, insight: { content: 'clear' } } })).toMatchObject({ eventId: 'evt-1', status: 'completed' }); });
    it('rejects incomplete completed results and invalid secrets', () => { expect(() => validateProviderResult({ eventId: 'evt-1', status: 'completed', evidence: {} })).toThrow('transcript and insight'); expect(verifyWebhookSecret('a', 'b')).toBe(false); expect(verifyWebhookSecret('secret', 'secret')).toBe(true); });
});
