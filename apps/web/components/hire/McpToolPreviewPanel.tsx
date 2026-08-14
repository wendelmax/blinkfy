'use client';

import { useState } from 'react';
import { ApiError, apiFetch } from '../../lib/api';

const TOOLS = ['candidate.search', 'application.preview_ats_export', 'application.preview_crm_export', 'calendar.suggest_slots'];
type Preview = { tool: string; scopes: string[]; approvalRequired: boolean; approved: boolean; executed: boolean; transmitted: boolean };
export function McpToolPreviewPanel({ clientId }: { clientId: string }) {
    const [toolId, setToolId] = useState(TOOLS[0]);
    const [argumentsText, setArgumentsText] = useState('{}');
    const [preview, setPreview] = useState<Preview | null>(null);
    const [error, setError] = useState('');
    async function createPreview() {
        setError('');
        try { const args = JSON.parse(argumentsText); const result = await apiFetch<{ preview: Preview }>(`/api/blinkfy/clients/${clientId}/concierge/mcp/preview`, { method: 'POST', body: JSON.stringify({ toolId, arguments: args }) }); setPreview(result.preview); }
        catch (caught) { setError(caught instanceof ApiError ? caught.message : 'MCP preview requires valid JSON arguments.'); }
    }
    return <section aria-label="MCP tool preview"><h2>MCP tool preview</h2><p>Preview only: approval is required and no tool is executed or transmitted.</p><label>Tool<select value={toolId} onChange={(event) => setToolId(event.target.value)}>{TOOLS.map((tool) => <option key={tool} value={tool}>{tool}</option>)}</select></label><label>Arguments JSON<textarea value={argumentsText} onChange={(event) => setArgumentsText(event.target.value)} rows={3} /></label><button type="button" onClick={() => void createPreview()}>Preview MCP call</button>{error && <p role="alert">{error}</p>}{preview && <div role="status"><p>{preview.tool} · scopes: {preview.scopes.join(', ')}</p><small>Approved: no. Executed: no. Transmitted: no.</small></div>}</section>;
}
