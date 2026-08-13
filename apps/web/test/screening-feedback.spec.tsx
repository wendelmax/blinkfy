import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ScreeningFeedback } from '../components/hire/ScreeningFeedback';

describe('Screening feedback', () => {
    it('frames feedback as human context and requires notes', () => {
        const markup = renderToStaticMarkup(<ScreeningFeedback jobId="job-1" applicationId="application-1" candidateName="Ada Lovelace" />);
        expect(markup).toContain('Recruiter feedback');
        expect(markup).toContain('does not advance or reject the application automatically');
        expect(markup).toContain('What should the next reviewer validate?');
        expect(markup).toContain('Save feedback');
    });
});
