'use client';

import { FormEvent, useState } from 'react';
import { ApiError, apiFetch } from '../../lib/api';
import type { ScreeningEvidence as Evidence } from '../../lib/types';

type Props = { jobId: string; applicationId: string; onAdded: (evidence: Evidence) => void };

export function ScreeningEvidenceForm({ jobId, applicationId, onAdded }: Props) {
    const [kind, setKind] = useState<Evidence['kind']>('transcript');
    const [content, setContent] = useState('');
    const [uri, setUri] = useState('');
    const [confidence, setConfidence] = useState('');
    const [retentionUntil, setRetentionUntil] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault(); setSaving(true); setError('');
        const body: Record<string, string | number> = { kind };
        if (content.trim()) body.content = content.trim();
        if (uri.trim()) body.uri = uri.trim();
        if (confidence !== '') body.confidence = Number(confidence);
        if (retentionUntil) body.retentionUntil = new Date(retentionUntil).toISOString();
        try {
            const response = await apiFetch<{ evidence: Evidence }>(`/api/blinkfy/jobs/${jobId}/applications/${applicationId}/screening/evidence`, { method: 'POST', body: JSON.stringify(body) });
            onAdded(response.evidence); setContent(''); setUri(''); setConfidence(''); setRetentionUntil('');
        } catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Screening evidence could not be saved.'); }
        finally { setSaving(false); }
    }

    return <section aria-label="Add screening evidence" style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #e2e8f0' }}>
        <h3>Add evidence</h3>
        <p>Record only consented screening material. Set retention when the source has a deletion deadline.</p>
        <form onSubmit={submit} style={{ display: 'grid', gap: 6 }}>
            <label>Evidence type <select value={kind} onChange={(event) => setKind(event.target.value as Evidence['kind'])}><option value="transcript">Transcript</option><option value="recording">Recording</option><option value="insight">Insight</option></select></label>
            <label>Content <textarea value={content} onChange={(event) => setContent(event.target.value)} rows={3} placeholder="Paste transcript or insight" /></label>
            <label>Evidence URI <input value={uri} onChange={(event) => setUri(event.target.value)} placeholder="https://…" /></label>
            <label>Confidence (0–100) <input type="number" min="0" max="100" value={confidence} onChange={(event) => setConfidence(event.target.value)} /></label>
            <label>Retain until <input type="date" value={retentionUntil} onChange={(event) => setRetentionUntil(event.target.value)} /></label>
            <button type="submit" disabled={saving || (!content.trim() && !uri.trim())}>{saving ? 'Saving…' : 'Save evidence'}</button>
        </form>
        {error && <p role="alert">{error}</p>}
    </section>;
}
