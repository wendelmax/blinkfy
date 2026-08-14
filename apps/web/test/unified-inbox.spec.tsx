import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { UnifiedInbox } from '../components/hire/UnifiedInbox';

describe('UnifiedInbox', () => {
    it('renders a recruiter-facing inbox heading', () => {
        expect(renderToStaticMarkup(<UnifiedInbox clientId="c1" jobId="j1" />)).toContain('Unified Concierge inbox');
    });
});
