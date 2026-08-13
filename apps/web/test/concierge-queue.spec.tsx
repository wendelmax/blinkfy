import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ConciergeQueue } from '../components/hire/ConciergeQueue';

describe('Concierge communication queue', () => {
    it('explains approval and channel safety at the job level', () => {
        const markup = renderToStaticMarkup(<ConciergeQueue jobId="job-1" applications={[{
            id: 'application-1', candidateId: 'candidate-1', fullName: 'Ada Lovelace', stage: 'interested', consentRecorded: true,
        }]} />);
        expect(markup).toContain('Concierge communication queue');
        expect(markup).toContain('Nothing is sent automatically');
        expect(markup).toContain('Pending review');
    });
});
