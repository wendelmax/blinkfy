import { describe, expect, it } from 'vitest';
import { InboundMessagePanel } from '../components/hire/InboundMessagePanel';

describe('InboundMessagePanel', () => {
    it('exposes an inbound message section for recruiter review', () => {
        const markup = String(InboundMessagePanel);
        expect(markup).toContain('Inbound messages');
        expect(markup).toContain('No inbound messages yet.');
    });
});
