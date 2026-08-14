'use client';
import { useState } from 'react';
import { ApiError, apiFetch } from '../../lib/api';
export function FollowUpPanel({ jobId, applicationId }: { jobId: string; applicationId: string }) {
    const [delays, setDelays] = useState('1,3,7'); const [message, setMessage] = useState('');
    async function save() { try { await apiFetch(`/api/blinkfy/jobs/${jobId}/applications/${applicationId}/follow-up`, { method: 'PUT', body: JSON.stringify({ delaysInDays: delays.split(',').map((value) => Number(value.trim())) }) }); setMessage('Follow-up plan saved. Every step requires approval.'); } catch (caught) { setMessage(caught instanceof ApiError ? caught.message : 'Follow-up plan could not be saved.'); } }
    return <section aria-label="Assisted follow-up"><h4>Assisted follow-up</h4><label>Delays in days<input value={delays} onChange={(event) => setDelays(event.target.value)} /></label><button type="button" onClick={save}>Save follow-up plan</button>{message && <p role="status">{message}</p>}<small>Every step requires approval. Any inbound reply interrupts the active plan. No message is sent automatically.</small></section>;
}
