'use client';

import { FormEvent } from 'react';

import { APPLICATION_STAGES, type AnalyticsSummary, type BlinkfyJob } from '../../lib/types';

type AnalyticsState = 'loading' | 'empty' | 'error' | 'ready';

type AnalyticsFilters = { jobId: string; from: string; to: string };

const transitionLabels: Record<string, string> = {
    mappedToReviewed: 'Mapped → Reviewed',
    reviewedToInterested: 'Reviewed → Interested',
    interestedToScreened: 'Interested → Screened',
    screenedToShortlisted: 'Screened → Shortlisted',
};

export function buildAnalyticsQuery({ jobId, from, to }: AnalyticsFilters) {
    const params = new URLSearchParams();
    if (jobId) params.set('jobId', jobId);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const query = params.toString();
    return query ? `?${query}` : '';
}

function percent(value: number | null) {
    return value == null ? 'No sample' : `${Math.round(value * 100)}%`;
}

function duration(value: number | null) {
    if (value == null) return 'No sample';
    const hours = value / 3600;
    return hours >= 1 ? `${hours.toFixed(1)}h` : `${Math.round(value)}s`;
}

type AnalyticsDashboardProps = AnalyticsFilters & {
    state: AnalyticsState;
    summary: AnalyticsSummary | null;
    message?: string;
    jobs: BlinkfyJob[];
    onJobIdChange: (value: string) => void;
    onFromChange: (value: string) => void;
    onToChange: (value: string) => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function AnalyticsDashboard({ state, summary, message, jobId, jobs, from, to, onJobIdChange, onFromChange, onToChange, onSubmit }: AnalyticsDashboardProps) {
    return (
        <div>
            <form onSubmit={onSubmit} className="flex flex-wrap gap-3 items-end mb-5">
                <label htmlFor="analytics-job">Job
                    <select id="analytics-job" value={jobId} onChange={(event) => onJobIdChange(event.target.value)}>
                        <option value="">All jobs</option>
                        {jobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}
                    </select>
                </label>
                <label htmlFor="analytics-from">From
                    <input id="analytics-from" type="date" value={from} onChange={(event) => onFromChange(event.target.value)} />
                </label>
                <label htmlFor="analytics-to">To
                    <input id="analytics-to" type="date" value={to} onChange={(event) => onToChange(event.target.value)} />
                </label>
                <button type="submit">Apply filters</button>
                {jobId && <a href={`/hire/jobs/${jobId}`}>View job pipeline</a>}
            </form>

            {state === 'loading' && <p>Loading analytics…</p>}
            {state === 'empty' && <p>No applications match this filter yet.</p>}
            {state === 'error' && <p role="alert">{message}</p>}

            {state === 'ready' && summary && (
                <>
                    <section aria-labelledby="analytics-volume">
                        <h2 id="analytics-volume">Applications</h2>
                        <p>Total: {summary.applications.total}</p>
                        <ul>
                            {APPLICATION_STAGES.map((stage) => (
                                <li key={stage}>{stage}: {summary.applications.byStage[stage] ?? 0}</li>
                            ))}
                        </ul>
                    </section>

                    <section aria-labelledby="analytics-conversion">
                        <h2 id="analytics-conversion">Conversion</h2>
                        <ul>
                            {Object.entries(summary.conversion).map(([key, value]) => (
                                <li key={key}>{transitionLabels[key] ?? key}: {percent(value)}</li>
                            ))}
                        </ul>
                    </section>

                    <section aria-labelledby="analytics-stage-time">
                        <h2 id="analytics-stage-time">Time in stage</h2>
                        <table>
                            <thead><tr><th>Stage</th><th>Average</th><th>Sample</th></tr></thead>
                            <tbody>
                                {Object.entries(summary.stageTime).map(([stage, metrics]) => (
                                    <tr key={stage}>
                                        <td>{stage}</td>
                                        <td>{duration(metrics.averageSeconds)}</td>
                                        <td>{metrics.sampleSize}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>

                    <section aria-labelledby="analytics-consent">
                        <h2 id="analytics-consent">Consent</h2>
                        <p>Active: {summary.consent.active}</p>
                        <p>Revoked: {summary.consent.revoked}</p>
                        <p>Missing: {summary.consent.missing}</p>
                    </section>

                    <section aria-labelledby="analytics-score">
                        <h2 id="analytics-score">Fit Score</h2>
                        {summary.score.count > 0
                            ? <p>Average {summary.score.average} (min {summary.score.minimum}, max {summary.score.maximum}) across {summary.score.count} scored applications.</p>
                            : <p>No scored applications in this scope.</p>}
                    </section>

                    <p>Generated at {new Date(summary.generatedAt).toLocaleString()}</p>
                </>
            )}
        </div>
    );
}
