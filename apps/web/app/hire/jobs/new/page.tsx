'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { getActiveClientId } from '../../../../lib/api';
import { JobForm } from '../../../../components/hire/JobForm';

export default function NewJobPage() {
    const router = useRouter();
    const [clientId, setClientId] = useState('');

    useEffect(() => setClientId(getActiveClientId()), []);

    return (
        <main style={{ maxWidth: 760, margin: '32px auto', padding: '0 20px' }}>
            <Link href="/hire">← Hire workspace</Link>
            <h1>Create a job</h1>
            <p>Weights make the advisory Fit Score transparent. They must total 100.</p>
            {!clientId && <p role="alert">Choose a workspace and client from the Hire workspace before creating a job.</p>}
            <JobForm clientId={clientId} onCreated={(job) => router.push(`/hire/jobs/${job.id}`)} />
        </main>
    );
}
