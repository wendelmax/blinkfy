'use client';

import { useState } from 'react';
import { apiFetch, ApiError } from '../../lib/api';

type Props = { jobId: string; applicationId: string };
type Preview = { provider: string; applicationId: string; contact: { fullName: string; email: string | null }; opportunity: { title: string; stage: string }; approved: boolean; transmitted: boolean };

export function CrmExportPreview({ jobId, applicationId }: Props) {
    const [provider, setProvider] = useState('hubspot');
    const [preview, setPreview] = useState<Preview | null>(null);
    const [error, setError] = useState('');
    async function createPreview() {
        setError('');
        try {
            const response = await apiFetch<{ preview: Preview }>(`/api/blinkfy/jobs/${jobId}/applications/${applicationId}/crm-export-preview`, { method: 'POST', body: JSON.stringify({ provider }) });
            setPreview(response.preview);
        } catch (caught) { setError(caught instanceof ApiError ? caught.message : 'The CRM preview could not be created.'); }
    }
    return <section aria-label="CRM export preview" style={{ marginTop: 10, padding: 10, border: '1px solid #d7dce2', borderRadius: 6 }}>
        <h4>CRM export preview</h4>
        <p>Consent and human approval are required. No external transmission occurs.</p>
        <label>CRM <select value={provider} onChange={(event) => setProvider(event.target.value)}><option value="hubspot">HubSpot</option><option value="salesforce">Salesforce</option><option value="pipedrive">Pipedrive</option></select></label>
        <button type="button" onClick={createPreview}>Preview CRM export</button>
        {error && <p role="alert">{error}</p>}
        {preview && <div role="status"><p>{preview.contact.fullName} · {preview.opportunity.title}</p><small>Provider: {preview.provider}. Approved: no. Transmitted: no.</small></div>}
    </section>;
}
