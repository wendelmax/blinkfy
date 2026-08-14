'use client';

import { useState } from 'react';
import { ApiError, apiFetch } from '../../lib/api';

type Item = { id: string; category: string; official: boolean; configured: boolean; requiresApproval: boolean; transmitted: boolean };
export function IntegrationCatalogPanel({ clientId }: { clientId: string }) {
    const [items, setItems] = useState<Item[]>([]);
    const [message, setMessage] = useState('');
    async function load() {
        try { const result = await apiFetch<{ items: Item[] }>(`/api/blinkfy/clients/${clientId}/concierge/integrations`); setItems(result.items); }
        catch (caught) { setMessage(caught instanceof ApiError ? caught.message : 'Integration catalog could not be loaded.'); }
    }
    return <section aria-label="Concierge integration catalog"><h2>Official integrations</h2><p>Connectors are discovery-only until separately configured and approved. No external transmission occurs.</p><button type="button" onClick={() => void load()}>Load integration catalog</button>{message && <p role="alert">{message}</p>}{items.length > 0 && <ul>{items.map((item) => <li key={item.id}>{item.id} · {item.category} · {item.configured ? 'configured' : 'not configured'} · approval required</li>)}</ul>}</section>;
}
