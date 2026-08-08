import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { AnalyticsDashboard, buildAnalyticsQuery } from '../components/hire/AnalyticsDashboard';
import type { AnalyticsSummary } from '../lib/types';

const fixtureSummary: AnalyticsSummary = {
    scope: { clientId: 'client_1', jobId: null, from: null, to: null },
    applications: { total: 12, byStage: { mapped: 4, reviewed: 3, interested: 2, screened: 2, shortlisted: 1, rejected: 0 } },
    conversion: { mappedToReviewed: 0.75, reviewedToInterested: null },
    stageTime: { reviewed: { averageSeconds: 86400, sampleSize: 3 }, interested: { averageSeconds: null, sampleSize: 0 } },
    consent: { active: 8, revoked: 1, missing: 3 },
    score: { count: 9, average: 78.4, minimum: 62, maximum: 94 },
    generatedAt: '2026-08-08T12:00:00.000Z',
};

const noopFilterProps = {
    jobId: '',
    jobs: [],
    from: '',
    to: '',
    onJobIdChange: () => {},
    onFromChange: () => {},
    onToChange: () => {},
    onSubmit: () => {},
};

describe('AnalyticsDashboard', () => {
    it('shows an explicit loading state instead of a blank screen', () => {
        const markup = renderToStaticMarkup(
            <AnalyticsDashboard state="loading" summary={null} {...noopFilterProps} />,
        );

        expect(markup).toContain('Loading analytics');
    });

    it('shows an explicit empty state when the client has no applications in scope', () => {
        const markup = renderToStaticMarkup(
            <AnalyticsDashboard state="empty" summary={null} {...noopFilterProps} />,
        );

        expect(markup).toContain('No applications match this filter yet');
    });

    it('shows the server error message instead of a generic failure', () => {
        const markup = renderToStaticMarkup(
            <AnalyticsDashboard state="error" summary={null} message="You do not have permission to view this workspace." {...noopFilterProps} />,
        );

        expect(markup).toContain('You do not have permission to view this workspace.');
    });

    it('renders conversion as a percentage and treats a missing denominator as "No sample" rather than 0%', () => {
        const markup = renderToStaticMarkup(
            <AnalyticsDashboard state="ready" summary={fixtureSummary} {...noopFilterProps} />,
        );

        expect(markup).toContain('75%');
        expect(markup).toContain('No sample');
    });

    it('renders active, revoked and missing consent counts', () => {
        const markup = renderToStaticMarkup(
            <AnalyticsDashboard state="ready" summary={fixtureSummary} {...noopFilterProps} />,
        );

        expect(markup).toContain('8');
        expect(markup).toContain('Active');
        expect(markup).toContain('1');
        expect(markup).toContain('Revoked');
        expect(markup).toContain('3');
        expect(markup).toContain('Missing');
    });

    it('renders Fit Score average, minimum and maximum', () => {
        const markup = renderToStaticMarkup(
            <AnalyticsDashboard state="ready" summary={fixtureSummary} {...noopFilterProps} />,
        );

        expect(markup).toContain('78.4');
        expect(markup).toContain('62');
        expect(markup).toContain('94');
    });

    it('links to the filtered job pipeline when a job is selected', () => {
        const markup = renderToStaticMarkup(
            <AnalyticsDashboard state="ready" summary={fixtureSummary} {...noopFilterProps} jobId="job_1" />,
        );

        expect(markup).toContain('href="/hire/jobs/job_1"');
    });
});

describe('buildAnalyticsQuery', () => {
    it('omits filters that are not set', () => {
        expect(buildAnalyticsQuery({ jobId: '', from: '', to: '' })).toBe('');
    });

    it('includes only the filters that are set, URL-encoded', () => {
        expect(buildAnalyticsQuery({ jobId: 'job 1', from: '2026-01-01', to: '' })).toBe('?jobId=job+1&from=2026-01-01');
    });

    it('includes all three filters when set', () => {
        expect(buildAnalyticsQuery({ jobId: 'job_1', from: '2026-01-01', to: '2026-02-01' })).toBe('?jobId=job_1&from=2026-01-01&to=2026-02-01');
    });
});
