'use client';

import { useEffect, useMemo, useState } from 'react';
import { ApiError, apiFetch } from '../../lib/api';
import type { MessageSuggestion, PipelineApplication } from '../../lib/types';

type Props = { jobId: string; applications: PipelineApplication[] };

export function ConciergeQueue({ jobId, applications }: Props) {
    const [items, setItems] = useState<MessageSuggestion[]>([]);
    const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
    const [filter, setFilter] = useState<'draft' | 'all'>('draft');
    const [error, setError] = useState('');
    const names = useMemo(() => new Map(applications.map((application) => [application.id, application.fullName])), [applications]);

    async function load() {
        try {
            const responses = await Promise.all(applications.map((application) => apiFetch<{ items: MessageSuggestion[] }>(`/api/blinkfy/jobs/${jobId}/applications/${application.id}/messages`)));
            setItems(responses.flatMap((response, index) => response.items.map((item) => ({ ...item, candidateName: names.get(applications[index].id) }))));
            setState('ready');
        } catch (caught) {
            setError(caught instanceof ApiError ? caught.message : 'Concierge drafts could not be loaded.');
            setState('error');
        }
    }

    useEffect(() => { void load(); }, [jobId, applications, names]);

    async function decide(item: MessageSuggestion, status: 'approved' | 'rejected') {
        setError('');
        try {
            const response = await apiFetch<{ suggestion: MessageSuggestion }>(`/api/blinkfy/jobs/${jobId}/applications/${item.applicationId}/messages/${item.id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
            setItems((current) => current.map((currentItem) => currentItem.id === item.id ? { ...currentItem, ...response.suggestion } : currentItem));
        } catch (caught) { setError(caught instanceof ApiError ? caught.message : 'The Concierge decision could not be saved.'); }
    }

    const visible = items.filter((item) => filter === 'all' || item.status === 'draft');
    const pending = items.filter((item) => item.status === 'draft').length;

    return <section aria-labelledby="concierge-queue-heading" style={{ margin: '20px 0', padding: 16, border: '1px solid #d8dee9', borderRadius: 10 }}>
        <h2 id="concierge-queue-heading">Concierge communication queue</h2>
        <p>{pending} draft(s) awaiting human review. Nothing is sent automatically.</p>
        <label htmlFor="concierge-filter">View</label>{' '}
        <select id="concierge-filter" value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)}><option value="draft">Pending review</option><option value="all">All decisions</option></select>
        {state === 'loading' && <p>Loading communication drafts…</p>}
        {state === 'error' && <p role="alert">{error}</p>}
        {state === 'ready' && visible.length === 0 && <p>No communication drafts match this view.</p>}
        {visible.map((item) => <article key={item.id} style={{ marginTop: 12, padding: 12, background: '#f5f7fa', borderRadius: 8 }}>
            <p><strong>{item.candidateName ?? 'Candidate'}</strong> · {item.channel} · {item.status}</p>
            <p>{item.content}</p>
            {item.status === 'draft' && <><button type="button" onClick={() => void decide(item, 'approved')}>Approve for sending</button>{' '}<button type="button" onClick={() => void decide(item, 'rejected')}>Reject draft</button></>}
        </article>)}
        {error && state === 'ready' && <p role="alert">{error}</p>}
    </section>;
}
