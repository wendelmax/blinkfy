import { describe, expect, it, vi } from 'vitest';

const { createNotificationDispatcher } = require('../../src/services/blinkfy/notificationService');

describe('operational notification dispatcher', () => {
    const event = {
        id: 'evt-1',
        type: 'screening.completed',
        workspaceId: 'ws-1',
        entityType: 'ScreeningSession',
        entityId: 'session-1',
        occurredAt: '2026-08-12T12:00:00.000Z',
        data: { candidateId: 'candidate-1' },
    };

    it('requires explicit approval before delivery and audits the decision', async () => {
        const audit = vi.fn().mockResolvedValue(undefined);
        const webhook = vi.fn();
        const dispatcher = createNotificationDispatcher({ audit, deliverWebhook: webhook });

        const result = await dispatcher.dispatch({ event, channel: 'webhook', target: 'https://example.test/hook', approved: false });

        expect(result).toEqual({ status: 'rejected', eventId: 'evt-1', channel: 'webhook' });
        expect(webhook).not.toHaveBeenCalled();
        expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'notification.rejected' }));
    });

    it('delivers approved webhook and records an auditable outcome', async () => {
        const audit = vi.fn().mockResolvedValue(undefined);
        const deliverWebhook = vi.fn().mockResolvedValue({ statusCode: 202 });
        const dispatcher = createNotificationDispatcher({ audit, deliverWebhook });

        const result = await dispatcher.dispatch({ event, channel: 'webhook', target: 'https://example.test/hook', approved: true });

        expect(result).toEqual({ status: 'delivered', eventId: 'evt-1', channel: 'webhook' });
        expect(deliverWebhook).toHaveBeenCalledWith({ url: 'https://example.test/hook', event });
        expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'notification.delivered' }));
    });

    it('supports approved email delivery and rejects unsupported channels', async () => {
        const deliverEmail = vi.fn().mockResolvedValue({ sent: true });
        const audit = vi.fn().mockResolvedValue(undefined);
        const dispatcher = createNotificationDispatcher({ deliverEmail, audit });
        await expect(dispatcher.dispatch({ event, channel: 'email', target: 'ops@example.test', approved: true }))
            .resolves.toMatchObject({ status: 'delivered', channel: 'email' });
        expect(deliverEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'ops@example.test', event }));
        expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'notification.delivered' }));

        await expect(dispatcher.dispatch({ event, channel: 'sms', target: '+5511', approved: true }))
            .rejects.toThrow('Unsupported notification channel');
    });
});
