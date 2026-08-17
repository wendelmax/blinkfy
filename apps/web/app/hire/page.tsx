'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';

import { apiFetch, ApiError, getActiveClientId, getActiveWorkspaceId, setAccessToken, setActiveClientId, setActiveWorkspaceId } from '../../lib/api';
import type { BlinkfyJob } from '../../lib/types';

function statusCopy(error: ApiError) {
    if (error.status === 401) return 'Your session has ended. Sign in again to continue.';
    if (error.status === 403) return 'You do not have permission to view this workspace.';
    if (error.status === 404) return 'The selected client is unavailable.';
    return error.message;
}

export default function HirePage() {
    const [workspaceId, setWorkspaceId] = useState('');
    const [clientId, setClientId] = useState('');
    const [token, setToken] = useState('');
    const [jobs, setJobs] = useState<BlinkfyJob[]>([]);
    const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const loadJobs = useCallback(async (activeClientId: string) => {
        if (!activeClientId) return;
        setState('loading');
        setMessage('');
        try {
            const response = await apiFetch<{ items: BlinkfyJob[] }>(`/api/blinkfy/clients/${activeClientId}/jobs`);
            setJobs(response.items);
            setState('idle');
        } catch (caught) {
            setJobs([]);
            setState('error');
            setMessage(caught instanceof ApiError ? statusCopy(caught) : 'Jobs could not be loaded.');
        }
    }, []);

    useEffect(() => {
        const savedWorkspace = getActiveWorkspaceId();
        const savedClient = getActiveClientId();
        setWorkspaceId(savedWorkspace);
        setClientId(savedClient);
        if (savedWorkspace && savedClient) void loadJobs(savedClient);
    }, [loadJobs]);

    function saveWorkspace(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setActiveWorkspaceId(workspaceId);
        setActiveClientId(clientId);
        if (token.trim()) setAccessToken(token);
        void loadJobs(clientId.trim());
    }

    return (
        <main className="max-w-[1080px] mx-auto py-8 px-5">
            <header className="mb-8">
                <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-1">Blinkfy Hire / Pilot</p>
                <h1 className="text-2xl font-bold mb-2">Recruiting workspace</h1>
                <p className="text-text-muted text-sm">
                    Bring permitted talent data into a reviewable pipeline. Candidate sharing remains private until consent is recorded.
                </p>
            </header>

            <section aria-labelledby="workspace-selection" className="bg-surface border border-border rounded-lg p-4 mb-5">
                <h2 id="workspace-selection" className="text-base font-semibold mb-3">Active workspace</h2>
                <form onSubmit={saveWorkspace} className="flex flex-wrap gap-3 items-end">
                    <label className="flex-1 min-w-[140px]">
                        Workspace ID
                        <input value={workspaceId} onChange={(event) => setWorkspaceId(event.target.value)} required />
                    </label>
                    <label className="flex-1 min-w-[140px]">
                        Client ID
                        <input value={clientId} onChange={(event) => setClientId(event.target.value)} required />
                    </label>
                    <label className="flex-1 min-w-[140px]">
                        Access token
                        <input type="password" value={token} onChange={(event) => setToken(event.target.value)} placeholder="Optional if already signed in" />
                    </label>
                    <button type="submit">Use workspace</button>
                </form>
            </section>

            <nav aria-label="Hire workspace" className="flex gap-3 mb-5">
                <Link href={clientId ? `/hire/jobs/new?clientId=${encodeURIComponent(clientId)}` : '/hire/jobs/new'} className="px-4 py-2 rounded-lg border border-border bg-surface text-sm font-medium hover:bg-surface-alt transition-colors">
                    Create job
                </Link>
                <Link href="/hire/candidates/import" className="px-4 py-2 rounded-lg border border-border bg-surface text-sm font-medium hover:bg-surface-alt transition-colors">
                    Import candidates
                </Link>
                <Link href="/hire/analytics" className="px-4 py-2 rounded-lg border border-border bg-surface text-sm font-medium hover:bg-surface-alt transition-colors">
                    Pipeline analytics
                </Link>
            </nav>

            <section aria-labelledby="jobs-heading" className="bg-surface border border-border rounded-lg p-4">
                <h2 id="jobs-heading" className="text-base font-semibold mb-3">Jobs</h2>
                {state === 'loading' && <p className="text-text-muted text-sm">Loading jobs...</p>}
                {state === 'error' && <p role="alert">{message}</p>}
                {state === 'idle' && clientId && jobs.length === 0 && (
                    <p className="text-text-muted text-sm">No jobs for this client yet. Create a job to start a reviewed shortlist.</p>
                )}
                {jobs.length > 0 && (
                    <ul className="divide-y divide-border">
                        {jobs.map((job) => (
                            <li key={job.id} className="py-3 flex items-center justify-between">
                                <Link href={`/hire/jobs/${job.id}`} className="font-medium text-sm">
                                    {job.title}
                                </Link>
                                <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-surface-alt text-text-muted border border-border">
                                    {job.status}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </main>
    );
}
