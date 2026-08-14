'use client';
import { useState } from 'react';
import { ApiError, apiFetch } from '../../lib/api';
type Item = { id: string; action: string; metadata: { tool?: string } | null; createdAt: string };
export function McpAuditPanel({ clientId }: { clientId: string }) {
    const [items, setItems] = useState<Item[]>([]); const [message, setMessage] = useState('');
    async function load() { try { const result = await apiFetch<{ items: Item[] }>(`/api/blinkfy/clients/${clientId}/concierge/mcp/audit`); setItems(result.items); } catch (caught) { setMessage(caught instanceof ApiError ? caught.message : 'MCP audit could not be loaded.'); } }
    return <section aria-label="MCP preview audit"><h2>MCP preview audit</h2><p>Tool metadata only; arguments are never exposed.</p><button type="button" onClick={() => void load()}>Load MCP audit</button>{message && <p role="alert">{message}</p>}{items.length > 0 && <ul>{items.map((item) => <li key={item.id}>{item.metadata?.tool ?? 'unknown'} · {item.action} · {new Date(item.createdAt).toLocaleString()}</li>)}</ul>}</section>;
}
