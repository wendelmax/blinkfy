'use client';

import { useState } from 'react';
import { apiFetch, ApiError } from '../../lib/api';
import type { TalentConsentSummary } from '../../lib/types';

export function ConsentCenter({ initialItems }: { initialItems: TalentConsentSummary[] }) {
    const [items, setItems] = useState(initialItems);
    const [error, setError] = useState('');
    const [revoking, setRevoking] = useState<string | null>(null);

    async function revoke(consent: TalentConsentSummary) {
        if (!window.confirm('Revoke this presentation consent?')) return;
        setError('');
        setRevoking(consent.id);
        try {
            const updated = await apiFetch<{ id: string; status: 'revoked'; revokedAt: string }>(`/api/blinkfy/talent/consents/${consent.id}/revoke`, { method: 'POST' });
            setItems((current) => current.map((item) => item.id === updated.id ? { ...item, status: updated.status, revokedAt: updated.revokedAt } : item));
        } catch (caught) {
            setError(caught instanceof ApiError ? caught.message : 'Consent could not be revoked.');
        } finally {
            setRevoking(null);
        }
    }

    return <section aria-labelledby="consent-heading">
        <h2 id="consent-heading">Consent Center</h2>
        <p>Review which companies may receive your profile. Consent evidence is never shown here.</p>
        {error && <p role="alert">{error}</p>}
        {items.length === 0 ? <p>No presentation consents yet.</p> : <ul>
            {items.map((consent) => <li key={consent.id} className="mb-3">
                <strong>{consent.client?.name ?? 'Global consent'}</strong>
                <span> — {consent.purpose} — {consent.status === 'active' ? 'Active' : 'Revoked'}</span>
                {consent.status === 'active' && <button type="button" onClick={() => revoke(consent)} disabled={revoking === consent.id}> {revoking === consent.id ? 'Revoking…' : 'Revoke'} </button>}
            </li>)}
        </ul>}
    </section>;
}
