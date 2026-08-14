'use client';
import { useState } from 'react';
import { ApiError, apiFetch } from '../../lib/api';
export function WebhookSubscriptionPanel({ clientId }: { clientId: string }) {
    const [url, setUrl] = useState(''); const [secret, setSecret] = useState(''); const [message, setMessage] = useState('');
    async function save() { try { await apiFetch(`/api/blinkfy/clients/${clientId}/concierge/webhooks`, { method: 'PUT', body: JSON.stringify({ url, secret, events: ['candidate.responded', 'screening.completed', 'stage.changed'] }) }); setMessage('Webhook subscription saved. Deliveries require approval.'); } catch (caught) { setMessage(caught instanceof ApiError ? caught.message : 'Webhook subscription could not be saved.'); } }
    return <section aria-label="Concierge webhook subscription"><h2>Webhook integration</h2><label>HTTPS endpoint<input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://..." /></label><label>Signing secret<input value={secret} onChange={(event) => setSecret(event.target.value)} type="password" /></label><button type="button" onClick={save}>Save webhook</button>{message && <p role="status">{message}</p>}<small>Deliveries require approval. Only approved events are delivered; browser credentials and autonomous candidate outreach are not supported.</small></section>;
}
