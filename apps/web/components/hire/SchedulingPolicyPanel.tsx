'use client';
import { useEffect, useState } from 'react';
import { ApiError, apiFetch } from '../../lib/api';
type Policy = { timezone: string; windows: { start: string; end: string }[]; requiresApproval: boolean; autonomousSending: boolean };
export function SchedulingPolicyPanel({ clientId }: { clientId: string }) {
    const [policy, setPolicy] = useState<Policy>({ timezone: 'UTC', windows: [], requiresApproval: true, autonomousSending: false });
    const [error, setError] = useState('');
    useEffect(() => { void apiFetch<{ policy: Policy | null }>(`/api/blinkfy/clients/${clientId}/concierge/scheduling-policy`).then((response) => { if (response.policy) setPolicy(response.policy); }).catch((caught) => setError(caught instanceof ApiError ? caught.message : 'Scheduling policy could not be loaded.')); }, [clientId]);
    async function save() { try { const response = await apiFetch<{ policy: Policy }>(`/api/blinkfy/clients/${clientId}/concierge/scheduling-policy`, { method: 'PUT', body: JSON.stringify(policy) }); setPolicy(response.policy); setError(''); } catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Scheduling policy could not be saved.'); } }
    return <section aria-label="Concierge scheduling policy"><h2>Scheduling policy</h2>{error && <p role="alert">{error}</p>}<label>Timezone<input value={policy.timezone} onChange={(event) => setPolicy({ ...policy, timezone: event.target.value })} /></label><p>Configured windows: {policy.windows.length}</p><button type="button" onClick={save}>Save scheduling policy</button><small>Every suggested slot requires human approval; autonomous sending is disabled.</small></section>;
}
