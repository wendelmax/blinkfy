import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { WebhookSubscriptionPanel } from '../components/hire/WebhookSubscriptionPanel';
describe('WebhookSubscriptionPanel', () => { it('renders approval guardrails', () => { expect(renderToStaticMarkup(<WebhookSubscriptionPanel clientId="c1" />)).toContain('Deliveries require approval'); }); });
