const channels = new Set(['linkedin', 'email', 'whatsapp']);

function validateMessageSuggestionInput(body = {}) {
    const channel = typeof body.channel === 'string' ? body.channel.trim().toLowerCase() : '';
    const content = typeof body.content === 'string' ? body.content.trim() : '';
    if (!channels.has(channel)) throw new Error('channel must be linkedin, email or whatsapp');
    if (!content) throw new Error('content is required');
    if (content.length > 5000) throw new Error('content must be 5000 characters or fewer');
    return { channel, content };
}

module.exports = { validateMessageSuggestionInput, channels };
