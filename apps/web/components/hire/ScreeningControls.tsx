'use client';

import { useState } from 'react';
import { ApiError, apiFetch } from '../../lib/api';
import type { ScreeningSessionStatus, ScreeningSessionSummary } from '../../lib/types';

type Props = { jobId: string; applicationId: string; candidateName: string };

export function ScreeningControls({ jobId, applicationId, candidateName }: Props) {
    const [session, setSession] = useState<ScreeningSessionSummary | null>(null);
    const [consentVersion, setConsentVersion] = useState('screen-v1');
    const [scheduledAt, setScheduledAt] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    async function action(path: string, body?: Record<string, string>) {
        setBusy(true); setError('');
        try {
            const response = await apiFetch<{ session: ScreeningSessionSummary }>(`/api/blinkfy/jobs/${jobId}/applications/${applicationId}/screening/${path}`, { method: 'POST', ...(body ? { body: JSON.stringify(body) } : {}) });
            setSession(response.session);
        } catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Screening action could not be completed.'); }
        finally { setBusy(false); }
    }

    const status: ScreeningSessionStatus | null = session?.status ?? null;
    return <section aria-label={`Screening controls for ${candidateName}`} className="mt-2.5 p-2.5 border border-border-input rounded-lg">
        <strong>Screening session</strong>
        <p>{status ? `Status: ${status}` : 'No screening session invited.'}</p>
        <small>Do not record screening consent until the candidate has actively opted in.</small>
        {!status && <button type="button" disabled={busy} onClick={() => void action('invite')}>Invite to screening</button>}
        {status === 'invited' && <div className="grid gap-1.5">
            <label><input type="checkbox" checked={false} onChange={(event) => { if (event.target.checked) void action('consent', { consentVersion }); }} disabled={busy} /> Record candidate consent ({consentVersion})</label>
            <label>Consent version <input value={consentVersion} onChange={(event) => setConsentVersion(event.target.value)} disabled={busy} /></label>
            <small>Do not check this box until the candidate has actively opted in.</small>
        </div>}
        {status === 'consented' && <div className="grid gap-1.5">
            <label>Screening time <input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} disabled={busy} required /></label>
            <button type="button" disabled={busy || !scheduledAt} onClick={() => void action('schedule', { scheduledAt: new Date(scheduledAt).toISOString() })}>Schedule screening</button>
        </div>}
        {status === 'scheduled' && <button type="button" disabled={busy} onClick={() => void action('start')}>Start screening</button>}
        {status === 'in_progress' && <button type="button" disabled={busy} onClick={() => void action('complete')}>Complete screening</button>}
        {status && !['completed', 'withdrawn'].includes(status) && <button type="button" disabled={busy} onClick={() => void action('withdraw')}>Withdraw screening</button>}
        {error && <p role="alert">{error}</p>}
    </section>;
}
