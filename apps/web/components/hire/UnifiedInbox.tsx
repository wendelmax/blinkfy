'use client';

import { useEffect, useState } from 'react';
import { ApiError, apiFetch } from '../../lib/api';

type InboxItem = { id: string; applicationId: string; candidateName: string; channel: string; content: string; receivedAt: string };

export function UnifiedInbox({ clientId, jobId }: { clientId: string; jobId: string }) {
    const [items, setItems] = useState<InboxItem[]>([]);
    const [error, setError] = useState('');
    useEffect(() => { void apiFetch<{ items: InboxItem[] }>(`/api/blinkfy/clients/${clientId}/jobs/${jobId}/inbox`).then((response) => setItems(response.items)).catch((caught) => setError(caught instanceof ApiError ? caught.message : 'Inbox could not be loaded.')); }, [clientId, jobId]);
    return <section aria-label="Unified Concierge inbox"><h2>Unified Concierge inbox</h2>{error && <p role="alert">{error}</p>}{items.length === 0 ? <p>No inbound messages yet.</p> : items.map((item) => <article key={item.id}><strong>{item.candidateName}</strong><p>{item.channel} · {new Date(item.receivedAt).toLocaleString()}</p><p>{item.content}</p></article>)}</section>;
}
