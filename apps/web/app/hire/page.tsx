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
        <main style={{ maxWidth: 1080, margin: '32px auto', padding: '0 20px' }}>
            <header>
                <p>BLINKFY HIRE / PILOT</p>
                <h1>Recruiting workspace</h1>
                <p>Bring permitted talent data into a reviewable pipeline. Candidate sharing remains private until consent is recorded.</p>
            </header>
            <section aria-labelledby="workspace-selection" style={{ border: '1px solid #d7dce5', borderRadius: 8, padding: 16 }}>
                <h2 id="workspace-selection">Active workspace</h2>
                <form onSubmit={saveWorkspace} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'end' }}>
                    <label>Workspace ID<input value={workspaceId} onChange={(event) => setWorkspaceId(event.target.value)} required /></label>
                    <label>Client ID<input value={clientId} onChange={(event) => setClientId(event.target.value)} required /></label>
                    <label>Access token<input type="password" value={token} onChange={(event) => setToken(event.target.value)} placeholder="Optional if already signed in" /></label>
                    <button type="submit">Use workspace</button>
                </form>
            </section>
            <nav aria-label="Hire workspace" style={{ display: 'flex', gap: 12, margin: '20px 0' }}>
                <Link href="/hire/jobs/new">Create job</Link>
                <Link href="/hire/candidates/import">Import candidates</Link>
            </nav>
            <section aria-labelledby="jobs-heading">
                <h2 id="jobs-heading">Jobs</h2>
                {state === 'loading' && <p>Loading jobs…</p>}
                {state === 'error' && <p role="alert">{message}</p>}
                {state === 'idle' && clientId && jobs.length === 0 && <p>No jobs for this client yet. Create a job to start a reviewed shortlist.</p>}
                {jobs.length > 0 && <ul>{jobs.map((job) => <li key={job.id}><Link href={`/hire/jobs/${job.id}`}>{job.title}</Link> — {job.status}</li>)}</ul>}
            </section>
        </main>
    );
}
