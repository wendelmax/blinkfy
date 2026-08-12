const { sendEmail } = require('../emailService');

const CHANNELS = new Set(['webhook', 'email']);

function requireString(value, field) {
    if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} must be a nonempty string`);
}

function validateEvent(event) {
    if (!event || typeof event !== 'object') throw new TypeError('event is required');
    for (const field of ['id', 'type', 'workspaceId', 'entityType', 'entityId']) requireString(event[field], `event.${field}`);
    if (!event.data || typeof event.data !== 'object' || Array.isArray(event.data)) throw new TypeError('event.data must be an object');
}

function createNotificationDispatcher({ audit = async () => {}, deliverWebhook = defaultWebhook, deliverEmail = sendEmail } = {}) {
    return {
        async dispatch({ event, channel, target, approved = false }) {
            validateEvent(event);
            requireString(channel, 'channel');
            requireString(target, 'target');
            if (!CHANNELS.has(channel)) throw new Error(`Unsupported notification channel: ${channel}`);
            const auditBase = {
                workspaceId: event.workspaceId,
                entityType: event.entityType,
                entityId: event.entityId,
                metadata: { eventId: event.id, eventType: event.type, channel, target },
            };
            if (!approved) {
                await audit({ ...auditBase, action: 'notification.rejected' });
                return { status: 'rejected', eventId: event.id, channel };
            }
            try {
                if (channel === 'webhook') await deliverWebhook({ url: target, event });
                else await deliverEmail({ to: target, subject: `Blinkfy: ${event.type}`, text: JSON.stringify(event) });
                await audit({ ...auditBase, action: 'notification.delivered' });
                return { status: 'delivered', eventId: event.id, channel };
            } catch (error) {
                await audit({ ...auditBase, action: 'notification.failed', metadata: { ...auditBase.metadata, error: error.message } });
                return { status: 'failed', eventId: event.id, channel, error: error.message };
            }
        },
    };
}

async function defaultWebhook({ url, event }) {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-blinkfy-event': event.type, 'x-blinkfy-event-id': event.id },
        body: JSON.stringify(event),
    });
    if (!response.ok) throw new Error(`Webhook returned HTTP ${response.status}`);
    return { statusCode: response.status };
}

module.exports = { createNotificationDispatcher, validateEvent };
