'use client';

import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../lib/api';

type Suggestion = { id: string; channel: 'linkedin' | 'email' | 'whatsapp'; content: string; status: 'draft' | 'approved' | 'rejected'; createdAt: string };

type Props = { jobId: string; applicationId: string; candidateName: string };

export function MessageSuggestions({ jobId, applicationId, candidateName }: Props) {
    const [items, setItems] = useState<Suggestion[]>([]);
    const [content, setContent] = useState('');
    const [channel, setChannel] = useState<Suggestion['channel']>('linkedin');
    const [error, setError] = useState('');
    const [open, setOpen] = useState(false);

    async function load() {
        try { setItems((await apiFetch<{ items: Suggestion[] }>(`/api/blinkfy/jobs/${jobId}/applications/${applicationId}/messages`)).items); }
        catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Messages could not be loaded.'); }
    }

    useEffect(() => { if (open) void load(); }, [open]);

    async function create(event: React.FormEvent) {
        event.preventDefault();
        if (!content.trim()) return;
        try {
            const response = await apiFetch<{ suggestion: Suggestion }>(`/api/blinkfy/jobs/${jobId}/applications/${applicationId}/messages`, { method: 'POST', body: JSON.stringify({ channel, content: content.trim() }) });
            setItems((current) => [response.suggestion, ...current]); setContent('');
        } catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Message draft could not be created.'); }
    }

    async function decide(suggestion: Suggestion, status: 'approved' | 'rejected') {
        try {
            const response = await apiFetch<{ suggestion: Suggestion }>(`/api/blinkfy/jobs/${jobId}/applications/${applicationId}/messages/${suggestion.id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
            setItems((current) => current.map((item) => item.id === suggestion.id ? response.suggestion : item));
        } catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Message decision could not be saved.'); }
    }

    return <section aria-label={`Message suggestions for ${candidateName}`}>
        <button type="button" onClick={() => setOpen((current) => !current)}>{open ? 'Hide message drafts' : 'Review message drafts'}</button>
        {open && <div>
            <h4>Human-approved communication</h4>
            <p>Drafts never send automatically. Approve only after review.</p>
            {error && <p role="alert">{error}</p>}
            <form onSubmit={create}>
                <label>Channel<select value={channel} onChange={(event) => setChannel(event.target.value as Suggestion['channel'])}><option value="linkedin">LinkedIn</option><option value="email">Email</option><option value="whatsapp">WhatsApp</option></select></label>
                <label>Draft message<textarea value={content} onChange={(event) => setContent(event.target.value)} required rows={3} /></label>
                <button type="submit">Save draft</button>
            </form>
            {items.length === 0 ? <p>No message drafts yet.</p> : items.map((item) => <article key={item.id}><p><strong>{item.channel}</strong> · {item.status}</p><p>{item.content}</p>{item.status === 'draft' && <><button type="button" onClick={() => decide(item, 'approved')}>Approve</button><button type="button" onClick={() => decide(item, 'rejected')}>Reject</button></>}</article>)}
        </div>}
    </section>;
}
