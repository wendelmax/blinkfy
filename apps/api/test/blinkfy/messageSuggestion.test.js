const { validateMessageSuggestionInput, channels } = require('../../src/services/blinkfy/messageSuggestionService');

describe('message suggestion validation', () => {
    test('normalizes an approved channel and content', () => {
        expect(validateMessageSuggestionInput({ channel: ' LinkedIn ', content: '  Hello candidate  ' })).toEqual({ channel: 'linkedin', content: 'Hello candidate' });
    });

    test('supports the configured channels', () => {
        expect([...channels]).toEqual(expect.arrayContaining(['linkedin', 'email', 'whatsapp']));
    });

    test('rejects invalid or oversized content', () => {
        expect(() => validateMessageSuggestionInput({ channel: 'sms', content: 'Hello' })).toThrow('channel');
        expect(() => validateMessageSuggestionInput({ channel: 'email', content: '' })).toThrow('content');
        expect(() => validateMessageSuggestionInput({ channel: 'email', content: 'x'.repeat(5001) })).toThrow('5000');
    });
});
