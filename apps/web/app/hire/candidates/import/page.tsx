'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { CandidateImport } from '../../../../components/hire/CandidateImport';
import { getActiveClientId } from '../../../../lib/api';

export default function CandidateImportPage() {
    const [clientId, setClientId] = useState('');
    useEffect(() => setClientId(getActiveClientId()), []);

    return (
        <main className="max-w-[760px] mx-auto py-8 px-5">
            <Link href="/hire" className="text-sm text-text-muted hover:text-primary mb-4 inline-block">
                &larr; Hire workspace
            </Link>
            <h1 className="text-2xl font-bold mb-2">Import permitted candidates</h1>
            {!clientId && <p role="alert">Choose a workspace and client from the Hire workspace before importing candidates.</p>}
            <CandidateImport clientId={clientId} />
        </main>
    );
}
