'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ApiError, apiFetch } from '../../lib/api';
import type { ScreeningFeedback as Feedback } from '../../lib/types';

type Props = { jobId: string; applicationId: string; candidateName: string };

export function ScreeningFeedback({ jobId, applicationId, candidateName }: Props) {
    const [items, setItems] = useState<Feedback[]>([]);
    const [status, setStatus] = useState<Feedback['status']>('neutral');
    const [note, setNote] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    async function load() {
        try { setItems((await apiFetch<{ items: Feedback[] }>(`/api/blinkfy/jobs/${jobId}/applications/${applicationId}/screening/feedback`)).items); }
        catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Screening feedback could not be loaded.'); }
    }
    useEffect(() => { void load(); }, [jobId, applicationId]);

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSaving(true); setError('');
        try {
            const response = await apiFetch<{ feedback: Feedback }>(`/api/blinkfy/jobs/${jobId}/applications/${applicationId}/screening/feedback`, { method: 'POST', body: JSON.stringify({ status, note }) });
            setItems((current) => [response.feedback, ...current]); setNote('');
        } catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Screening feedback could not be saved.'); }
        finally { setSaving(false); }
    }

    return <section aria-label={`Recruiter feedback for ${candidateName}`} className="mt-4 pt-3 border-t border-border-input">
        <h3>Recruiter feedback</h3>
        <p>Record evidence-based context for the next human reviewer. This does not advance or reject the application automatically.</p>
        <form onSubmit={submit} className="grid gap-1.5">
            <label>Assessment <select value={status} onChange={(event) => setStatus(event.target.value as Feedback['status'])}><option value="positive">Positive</option><option value="neutral">Neutral</option><option value="negative">Negative</option><option value="needs_review">Needs review</option></select></label>
            <label>Notes <textarea value={note} onChange={(event) => setNote(event.target.value)} required maxLength={2000} rows={3} placeholder="What should the next reviewer validate?" /></label>
            <button type="submit" disabled={saving || !note.trim()}>{saving ? 'Saving…' : 'Save feedback'}</button>
        </form>
        {error && <p role="alert">{error}</p>}
        {items.length === 0 ? <p>No recruiter feedback recorded yet.</p> : <div>{items.map((item) => <article key={item.id}><p><strong>{item.status.replace('_', ' ')}</strong> · {new Date(item.createdAt).toLocaleString()}</p><p>{item.note}</p></article>)}</div>}
    </section>;
}
