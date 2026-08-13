'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { PipelineBoard } from '../../../../components/hire/PipelineBoard';
import { ConciergeQueue } from '../../../../components/hire/ConciergeQueue';
import { apiFetch, ApiError, getActiveClientId } from '../../../../lib/api';
import type { BlinkfyJob, PipelineApplication } from '../../../../lib/types';

export default function JobPipelinePage() {
    const params = useParams<{ jobId: string }>();
    const [job, setJob] = useState<BlinkfyJob | null>(null);
    const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
    const [message, setMessage] = useState('');
    const [applications, setApplications] = useState<PipelineApplication[]>([]);

    useEffect(() => {
        const clientId = getActiveClientId();
        if (!clientId) {
            setState('error');
            setMessage('Choose a workspace and client from the Hire workspace first.');
            return;
        }
        async function loadJob() {
            try {
                const response = await apiFetch<{ items: BlinkfyJob[] }>(`/api/blinkfy/clients/${clientId}/jobs`);
                const selected = response.items.find((item) => item.id === params.jobId);
                if (!selected) {
                    setMessage('This job is unavailable.');
                    setState('error');
                    return;
                }
                const pipeline = await apiFetch<{ items: PipelineApplication[] }>(`/api/blinkfy/jobs/${params.jobId}/applications`);
                setJob(selected);
                setApplications(pipeline.items);
                setState('ready');
            } catch (caught) {
                const error = caught as ApiError;
                setMessage(error?.status === 403 ? 'You do not have permission to view this workspace.' : error?.status === 401 ? 'Your session has ended. Sign in again to continue.' : 'This job is unavailable.');
                setState('error');
            }
        }
        void loadJob();
    }, [params.jobId]);

    return (
        <main style={{ maxWidth: 1440, margin: '32px auto', padding: '0 20px' }}>
            <Link href="/hire">← Hire workspace</Link>
            {state === 'loading' && <p>Loading job…</p>}
            {state === 'error' && <p role="alert">{message}</p>}
            {state === 'ready' && job && <>
                <h1>{job.title}</h1>
                <p>{job.requirements.join(' · ')}</p>
                <ConciergeQueue jobId={job.id} applications={applications} />
                <PipelineBoard jobId={job.id} applications={applications} />
            </>}
        </main>
    );
}
