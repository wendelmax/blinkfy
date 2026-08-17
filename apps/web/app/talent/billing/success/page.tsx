'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { ApiError, apiFetch } from '../../../../lib/api';
import type { CheckoutStatusResponse } from '../../../../lib/types';

function CheckoutSuccessContent() {
    const searchParams = useSearchParams();
    const sessionId = searchParams.get('session_id');
    const [status, setStatus] = useState<CheckoutStatusResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!sessionId) { setLoading(false); return; }
        void apiFetch<CheckoutStatusResponse>(`/api/blinkfy/billing/checkout/status?session_id=${encodeURIComponent(sessionId)}`)
            .then(setStatus)
            .catch((caught) => setError(caught instanceof ApiError ? caught.message : 'Could not verify checkout status.'))
            .finally(() => setLoading(false));
    }, [sessionId]);

    return (
        <div style={{ maxWidth: '600px', margin: '4rem auto', padding: '2rem', textAlign: 'center' }}>
            <h1>{loading ? 'Verifying payment…' : error ? 'Payment verification failed' : 'Payment successful!'}</h1>
            {loading && <p>We&apos;re confirming your Pro subscription. This may take a moment.</p>}
            {error && <p role="alert" style={{ color: 'var(--color-error, #dc2626)' }}>{error}</p>}
            {status && !error && (
                <div>
                    <p>Welcome to <strong>Blinkfy Pro</strong>! Your subscription is now <strong>{status.subscription?.status || 'active'}</strong>.</p>
                    <p>You now have access to AI content drafts, advanced analytics, and priority support.</p>
                </div>
            )}
            <div style={{ marginTop: '2rem' }}>
                <Link href="/talent">Back to Talent Profile</Link>
            </div>
        </div>
    );
}

export default function CheckoutSuccessPage() {
    return (
        <Suspense fallback={<p style={{ textAlign: 'center', marginTop: '4rem' }}>Loading…</p>}>
            <CheckoutSuccessContent />
        </Suspense>
    );
}
