import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { PipelineBoard } from '../components/hire/PipelineBoard';

describe('Screen review dossier', () => {
    it('keeps the pipeline human-led and explains missing evidence', () => {
        const markup = renderToStaticMarkup(<PipelineBoard jobId="job-1" applications={[{
            id: 'application-1', candidateId: 'candidate-1', fullName: 'Ada Lovelace', currentTitle: 'Sales Engineer', stage: 'screened', consentRecorded: true, score: null,
        }]} />);
        expect(markup).toContain('Reviewed pipeline');
        expect(markup).toContain('Scores support human review; they never reject candidates automatically.');
        expect(markup).toContain('Review screening dossier');
    });
});
