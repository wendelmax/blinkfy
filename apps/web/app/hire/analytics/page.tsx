'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';

import { AnalyticsDashboard, buildAnalyticsQuery } from '../../../components/hire/AnalyticsDashboard';
import { apiFetch, ApiError, getActiveClientId } from '../../../lib/api';
import type { AnalyticsSummary, BlinkfyJob } from '../../../lib/types';

function statusCopy(error: ApiError) {
    if (error.status === 401) return 'Your session has ended. Sign in again to continue.';
    if (error.status === 403) return 'You do not have permission to view this workspace.';
    if (error.status === 404) return 'The selected client is unavailable.';
    return error.message;
}

export default function AnalyticsPage() {
    const [clientId, setClientId] = useState('');
    const [jobs, setJobs] = useState<BlinkfyJob[]>([]);
    const [jobId, setJobId] = useState('');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
    const [state, setState] = useState<'loading' | 'empty' | 'error' | 'ready'>('loading');
    const [message, setMessage] = useState('');

    const load = useCallback(async (activeClientId: string, filters: { jobId: string; from: string; to: string }) => {
        setState('loading');
        setMessage('');
        try {
            const query = buildAnalyticsQuery(filters);
            const response = await apiFetch<AnalyticsSummary>(`/api/blinkfy/clients/${activeClientId}/analytics${query}`);
            setSummary(response);
            setState(response.applications.total === 0 ? 'empty' : 'ready');
        } catch (caught) {
            setSummary(null);
            setState('error');
            setMessage(caught instanceof ApiError ? statusCopy(caught) : 'Analytics could not be loaded.');
        }
    }, []);

    useEffect(() => {
        const activeClientId = getActiveClientId();
        setClientId(activeClientId);
        if (!activeClientId) {
            setState('error');
            setMessage('Choose a workspace and client from the Hire workspace first.');
            return;
        }
        void load(activeClientId, { jobId: '', from: '', to: '' });
        apiFetch<{ items: BlinkfyJob[] }>(`/api/blinkfy/clients/${activeClientId}/jobs`)
            .then((response) => setJobs(response.items))
            .catch(() => setJobs([]));
    }, [load]);

    function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (clientId) void load(clientId, { jobId, from, to });
    }

    return (
        <main className="max-w-[1080px] mx-auto py-8 px-5">
            <Link href="/hire" className="text-sm text-text-muted hover:text-primary mb-4 inline-block">
                &larr; Hire workspace
            </Link>
            <header className="mb-6">
                <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-1">Blinkfy Hire / Pilot</p>
                <h1 className="text-2xl font-bold mb-2">Pipeline analytics</h1>
                <p className="text-text-muted text-sm">
                    Operational metrics only — analytics never rejects a candidate or changes a stage.
                </p>
            </header>
            <AnalyticsDashboard
                state={state}
                summary={summary}
                message={message}
                jobId={jobId}
                jobs={jobs}
                from={from}
                to={to}
                onJobIdChange={setJobId}
                onFromChange={setFrom}
                onToChange={setTo}
                onSubmit={onSubmit}
            />
        </main>
    );
}
