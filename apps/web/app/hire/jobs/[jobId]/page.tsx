'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { PipelineBoard } from '../../../../components/hire/PipelineBoard';
import { ConciergeQueue } from '../../../../components/hire/ConciergeQueue';
import { UnifiedInbox } from '../../../../components/hire/UnifiedInbox';
import { SchedulingPolicyPanel } from '../../../../components/hire/SchedulingPolicyPanel';
import { WebhookSubscriptionPanel } from '../../../../components/hire/WebhookSubscriptionPanel';
import { IntegrationCatalogPanel } from '../../../../components/hire/IntegrationCatalogPanel';
import { McpManifestPanel } from '../../../../components/hire/McpManifestPanel';
import { McpToolPreviewPanel } from '../../../../components/hire/McpToolPreviewPanel';
import { McpAuditPanel } from '../../../../components/hire/McpAuditPanel';
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
        <main className="max-w-[1440px] mx-auto py-8 px-5">
            <Link href="/hire" className="text-sm text-text-muted hover:text-primary mb-4 inline-block">
                &larr; Hire workspace
            </Link>
            {state === 'loading' && <p className="text-text-muted text-sm">Loading job...</p>}
            {state === 'error' && <p role="alert">{message}</p>}
            {state === 'ready' && job && (
                <div className="space-y-6">
                    <header>
                        <h1 className="text-2xl font-bold mb-1">{job.title}</h1>
                        <p className="text-text-muted text-sm">{job.requirements.join(' · ')}</p>
                    </header>
                    <ConciergeQueue jobId={job.id} applications={applications} />
                    <UnifiedInbox clientId={job.clientId} jobId={job.id} />
                    <SchedulingPolicyPanel clientId={job.clientId} />
                    <WebhookSubscriptionPanel clientId={job.clientId} />
                    <IntegrationCatalogPanel clientId={job.clientId} />
                    <McpManifestPanel clientId={job.clientId} />
                    <McpToolPreviewPanel clientId={job.clientId} />
                    <McpAuditPanel clientId={job.clientId} />
                    <PipelineBoard jobId={job.id} applications={applications} />
                </div>
            )}
        </main>
    );
}
