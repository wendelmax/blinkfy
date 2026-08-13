import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ScreeningControls } from '../components/hire/ScreeningControls';

describe('Screening controls', () => {
    it('requires an explicit candidate opt-in before scheduling', () => {
        const markup = renderToStaticMarkup(<ScreeningControls jobId="job-1" applicationId="application-1" candidateName="Ada Lovelace" />);
        expect(markup).toContain('Invite to screening');
        expect(markup).not.toContain('Schedule screening');
        expect(markup).toContain('Do not check this box until the candidate has actively opted in.');
    });
});
