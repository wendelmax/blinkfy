'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { getActiveClientId } from '../../../../lib/api';
import { JobForm } from '../../../../components/hire/JobForm';

export default function NewJobPage() {
    const router = useRouter();
    const [clientId, setClientId] = useState(() => (
        typeof window === 'undefined'
            ? ''
            : new URLSearchParams(window.location.search).get('clientId') || getActiveClientId()
    ));
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const clientFromUrl = new URLSearchParams(window.location.search).get('clientId');
        setClientId(clientFromUrl || getActiveClientId());
        setReady(true);
    }, []);

    return (
        <main className="max-w-[760px] mx-auto py-8 px-5">
            <Link href="/hire" className="text-sm text-text-muted hover:text-primary mb-4 inline-block">
                &larr; Hire workspace
            </Link>
            <h1 className="text-2xl font-bold mb-2">Create a job</h1>
            <p className="text-text-muted text-sm mb-6">
                Weights make the advisory Fit Score transparent. They must total 100.
            </p>
            {!ready && <p role="status">Loading active client...</p>}
            {ready && !clientId && <p role="alert">Choose a workspace and client from the Hire workspace before creating a job.</p>}
            {ready && clientId && <JobForm clientId={clientId} onCreated={(job) => router.push(`/hire/jobs/${job.id}`)} />}
        </main>
    );
}
