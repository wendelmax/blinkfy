import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { WebhookSubscriptionPanel } from '../components/hire/WebhookSubscriptionPanel';

describe('WebhookSubscriptionPanel', () => {
    it('exposes human review controls for the outbox', () => {
        const markup = renderToStaticMarkup(<WebhookSubscriptionPanel clientId="client-1" />);
        expect(markup).toContain('Load pending deliveries');
        expect(markup).toContain('Deliveries require approval');
    });
});
