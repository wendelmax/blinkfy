'use client';

import { useState } from 'react';
import { ApiError, apiFetch } from '../../lib/api';

type Tool = { id: string; description: string; scopes: string[]; approvalRequired: boolean; enabled: boolean; transmitted: boolean };
export function McpManifestPanel({ clientId }: { clientId: string }) {
    const [tools, setTools] = useState<Tool[]>([]);
    const [message, setMessage] = useState('');
    async function load() {
        try { const result = await apiFetch<{ tools: Tool[] }>(`/api/blinkfy/clients/${clientId}/concierge/mcp/manifest`); setTools(result.tools); }
        catch (caught) { setMessage(caught instanceof ApiError ? caught.message : 'MCP manifest could not be loaded.'); }
    }
    return <section aria-label="Concierge MCP manifest"><h2>MCP capabilities</h2><p>Tools are disabled until separately authorized. Approval is required and no transmission occurs.</p><button type="button" onClick={() => void load()}>Load MCP manifest</button>{message && <p role="alert">{message}</p>}{tools.length > 0 && <ul>{tools.map((tool) => <li key={tool.id}>{tool.id} · {tool.scopes.join(', ')} · {tool.enabled ? 'enabled' : 'disabled'} · approval required</li>)}</ul>}</section>;
}
