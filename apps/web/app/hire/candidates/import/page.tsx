'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { CandidateImport } from '../../../../components/hire/CandidateImport';
import { getActiveClientId } from '../../../../lib/api';

export default function CandidateImportPage() {
    const [clientId, setClientId] = useState('');
    useEffect(() => setClientId(getActiveClientId()), []);

    return (
        <main style={{ maxWidth: 760, margin: '32px auto', padding: '0 20px' }}>
            <Link href="/hire">← Hire workspace</Link>
            <h1>Import permitted candidates</h1>
            {!clientId && <p role="alert">Choose a workspace and client from the Hire workspace before importing candidates.</p>}
            <CandidateImport clientId={clientId} />
        </main>
    );
}
