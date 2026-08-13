'use client';
import { useEffect, useState } from 'react';
import { ApiError, apiFetch } from '../../lib/api';
type Invitation = { id: string; status: 'invited'; createdAt: string; job: { id: string; title: string; client: { id: string; name: string } } | null };
export function ScreeningInvitations() {
    const [items, setItems] = useState<Invitation[]>([]); const [error, setError] = useState(''); const [consentVersion, setConsentVersion] = useState('screen-v1');
    async function load() { try { setItems((await apiFetch<{ items: Invitation[] }>('/api/blinkfy/talent/screening/invitations')).items); } catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Screening invitations could not be loaded.'); } }
    useEffect(() => { void load(); }, []);
    async function consent(sessionId: string) { setError(''); try { await apiFetch(`/api/blinkfy/talent/screening/invitations/${sessionId}/consent`, { method: 'POST', body: JSON.stringify({ consentVersion }) }); setItems((current) => current.filter((item) => item.id !== sessionId)); } catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Consent could not be recorded.'); } }
    return <section aria-labelledby="screening-invitations-heading" style={{ marginTop: 24, padding: 20, border: '1px solid #d8dee9', borderRadius: 10 }}><h2 id="screening-invitations-heading">Screening invitations</h2><p>You decide whether to opt in. No screening starts until you explicitly consent.</p><label>Consent version <input value={consentVersion} onChange={(event) => setConsentVersion(event.target.value)} /></label>{error && <p role="alert">{error}</p>}{items.length === 0 ? <p>No pending screening invitations.</p> : items.map((item) => <article key={item.id}><p><strong>{item.job?.title ?? 'Screening invitation'}</strong>{item.job?.client ? ` · ${item.job.client.name}` : ''}</p><button type="button" onClick={() => void consent(item.id)}>I consent to screening</button></article>)}</section>;
}
