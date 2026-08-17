'use client';

import { useState } from 'react';
import { apiFetch, ApiError } from '../../lib/api';

type Props = { jobId: string; applicationId: string };
type Preview = { provider: string; applicationId: string; candidate: { fullName: string; email: string | null }; jobTitle: string; approved: boolean; transmitted: boolean };

export function AtsExportPreview({ jobId, applicationId }: Props) {
    const [provider, setProvider] = useState('greenhouse');
    const [preview, setPreview] = useState<Preview | null>(null);
    const [error, setError] = useState('');

    async function createPreview() {
        setError('');
        try {
            const response = await apiFetch<{ preview: Preview }>(`/api/blinkfy/jobs/${jobId}/applications/${applicationId}/ats-export-preview`, {
                method: 'POST', body: JSON.stringify({ provider }),
            });
            setPreview(response.preview);
        } catch (caught) {
            setError(caught instanceof ApiError ? caught.message : 'The ATS preview could not be created.');
        }
    }

    return <section aria-label="ATS export preview" className="mt-2.5 p-2.5 border border-border-input rounded-md">
        <h4>ATS export preview</h4>
        <p>Consent and human approval are required. No external transmission occurs.</p>
        <label>Provider <select value={provider} onChange={(event) => setProvider(event.target.value)}><option value="greenhouse">Greenhouse</option><option value="lever">Lever</option><option value="workable">Workable</option></select></label>
        <button type="button" onClick={createPreview}>Preview ATS export</button>
        {error && <p role="alert">{error}</p>}
        {preview && <div role="status"><p>{preview.candidate.fullName} · {preview.jobTitle}</p><small>Provider: {preview.provider}. Approved: no. Transmitted: no.</small></div>}
    </section>;
}
