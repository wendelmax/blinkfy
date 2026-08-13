'use client';
import { useEffect, useState } from 'react';
import { ApiError, apiFetch } from '../../lib/api';
type Message = { id: string; channel: string; content: string; receivedAt: string };
export function InboundMessagePanel({ jobId, applicationId, candidateName }: { jobId: string; applicationId: string; candidateName: string }) {
    const [items, setItems] = useState<Message[]>([]); const [error, setError] = useState('');
    useEffect(() => { void apiFetch<{ items: Message[] }>(`/api/blinkfy/jobs/${jobId}/applications/${applicationId}/inbox`).then((response) => setItems(response.items)).catch((caught) => setError(caught instanceof ApiError ? caught.message : 'Inbox could not be loaded.')); }, [jobId, applicationId]);
    return <section aria-label={`Inbound messages for ${candidateName}`}><strong>Inbound messages</strong>{error && <p role="alert">{error}</p>}{items.length === 0 ? <p>No inbound messages yet.</p> : items.map((item) => <article key={item.id}><p><strong>{item.channel}</strong> · {new Date(item.receivedAt).toLocaleString()}</p><p>{item.content}</p></article>)}</section>;
}
