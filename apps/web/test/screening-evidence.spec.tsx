import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ScreeningEvidenceForm } from '../components/hire/ScreeningEvidenceForm';

describe('Screening evidence form', () => {
    it('supports auditable evidence fields', () => {
        const markup = renderToStaticMarkup(<ScreeningEvidenceForm jobId="job-1" applicationId="application-1" onAdded={() => {}} />);
        expect(markup).toContain('Add evidence');
        expect(markup).toContain('Transcript');
        expect(markup).toContain('Confidence (0–100)');
        expect(markup).toContain('Retain until');
        expect(markup).toContain('Save evidence');
    });
});
