'use client';

import { useState } from 'react';
import { ApiError, apiFetch } from '../../lib/api';
import type { IntegrationConfig, IntegrationExecution, SupportedProvider } from '../../lib/types';

export function IntegrationManager() {
    const [configs, setConfigs] = useState<IntegrationConfig[]>([]);
    const [executions, setExecutions] = useState<IntegrationExecution[]>([]);
    const [providers, setProviders] = useState<SupportedProvider[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState('');
    const [creating, setCreating] = useState(false);
    const [activeTab, setActiveTab] = useState<'configs' | 'executions'>('configs');

    async function loadData() {
        setLoading(true);
        setError('');
        try {
            const [configsRes, execRes, provRes] = await Promise.all([
                apiFetch<{ items: IntegrationConfig[] }>('/api/blinkfy/integrations/configs'),
                apiFetch<{ items: IntegrationExecution[] }>('/api/blinkfy/integrations/executions'),
                apiFetch<{ items: SupportedProvider[] }>('/api/blinkfy/integrations/providers'),
            ]);
            setConfigs(configsRes.items);
            setExecutions(execRes.items);
            setProviders(provRes.items);
        } catch (caught) {
            setError(caught instanceof ApiError ? caught.message : 'Failed to load integrations');
        } finally {
            setLoading(false);
        }
    }

    async function handleCreate() {
        if (!selectedProvider) { setError('Select a provider'); return; }
        const provider = providers.find(p => p.provider === selectedProvider);
        setCreating(true);
        setError('');
        try {
            await apiFetch('/api/blinkfy/integrations/configs', {
                method: 'POST',
                body: JSON.stringify({ provider: selectedProvider, category: provider?.category || 'calendar' }),
            });
            setShowCreate(false);
            setSelectedProvider('');
            await loadData();
        } catch (caught) {
            setError(caught instanceof ApiError ? caught.message : 'Failed to create integration');
        } finally {
            setCreating(false);
        }
    }

    async function toggleKillSwitch(configId: string, current: boolean) {
        try {
            await apiFetch(`/api/blinkfy/integrations/configs/${configId}`, {
                method: 'PATCH',
                body: JSON.stringify({ killSwitch: !current }),
            });
            await loadData();
        } catch (caught) {
            setError(caught instanceof ApiError ? caught.message : 'Failed to toggle kill switch');
        }
    }

    async function toggleActive(configId: string, currentStatus: string) {
        try {
            await apiFetch(`/api/blinkfy/integrations/configs/${configId}`, {
                method: 'PATCH',
                body: JSON.stringify({ status: currentStatus === 'active' ? 'inactive' : 'active' }),
            });
            await loadData();
        } catch (caught) {
            setError(caught instanceof ApiError ? caught.message : 'Failed to toggle status');
        }
    }

    async function approveExecution(executionId: string) {
        try {
            await apiFetch(`/api/blinkfy/integrations/executions/${executionId}/approve`, { method: 'POST' });
            await loadData();
        } catch (caught) {
            setError(caught instanceof ApiError ? caught.message : 'Failed to approve');
        }
    }

    async function executeAction(executionId: string) {
        try {
            await apiFetch(`/api/blinkfy/integrations/executions/${executionId}/execute`, { method: 'POST' });
            await loadData();
        } catch (caught) {
            setError(caught instanceof ApiError ? caught.message : 'Failed to execute');
        }
    }

    async function cancelExecution(executionId: string) {
        try {
            await apiFetch(`/api/blinkfy/integrations/executions/${executionId}/cancel`, { method: 'POST' });
            await loadData();
        } catch (caught) {
            setError(caught instanceof ApiError ? caught.message : 'Failed to cancel');
        }
    }

    function statusBadge(status: string) {
        const colors: Record<string, string> = {
            active: 'bg-green-100 text-green-800',
            inactive: 'bg-gray-100 text-gray-600',
            error: 'bg-red-100 text-red-800',
            rate_limited: 'bg-yellow-100 text-yellow-800',
            completed: 'bg-green-100 text-green-800',
            pending_approval: 'bg-yellow-100 text-yellow-800',
            approved: 'bg-blue-100 text-blue-800',
            executing: 'bg-blue-100 text-blue-800',
            failed: 'bg-red-100 text-red-800',
            cancelled: 'bg-gray-100 text-gray-600',
        };
        return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[status] || 'bg-gray-100'}`}>{status.replace(/_/g, ' ')}</span>;
    }

    return (
        <section className="p-5 border border-border-strong rounded-[10px]" aria-labelledby="integrations-heading">
            <div className="flex items-center justify-between mb-3">
                <h3 id="integrations-heading" className="font-semibold text-lg">Integration Adapters</h3>
                <div className="flex gap-2">
                    <button onClick={() => void loadData()} disabled={loading} className="text-xs bg-primary text-white px-3 py-1 rounded hover:opacity-90 disabled:opacity-50">
                        {loading ? 'Loading...' : 'Load'}
                    </button>
                </div>
            </div>

            <p className="text-text-muted text-xs mb-4">
                External integrations require explicit human approval before execution. Kill switches block all external calls by default.
            </p>

            {error && <p role="alert" className="text-red-600 text-sm mb-3">{error}</p>}

            <div className="flex gap-2 mb-4">
                <button onClick={() => setActiveTab('configs')} className={`text-xs px-3 py-1 rounded ${activeTab === 'configs' ? 'bg-primary text-white' : 'border border-border-strong'}`}>
                    Configurations ({configs.length})
                </button>
                <button onClick={() => setActiveTab('executions')} className={`text-xs px-3 py-1 rounded ${activeTab === 'executions' ? 'bg-primary text-white' : 'border border-border-strong'}`}>
                    Executions ({executions.length})
                </button>
            </div>

            {activeTab === 'configs' && (
                <>
                    {!showCreate ? (
                        <button onClick={() => setShowCreate(true)} className="text-sm bg-primary text-white px-3 py-1.5 rounded hover:opacity-90 mb-4">
                            + Add Integration
                        </button>
                    ) : (
                        <div className="bg-surface-secondary p-4 rounded mb-4 flex items-end gap-3">
                            <label className="text-xs flex-1">
                                Provider
                                <select value={selectedProvider} onChange={e => setSelectedProvider(e.target.value)} className="w-full mt-1 border border-border-strong rounded px-2 py-1 text-sm">
                                    <option value="">Select provider...</option>
                                    {providers.map(p => (
                                        <option key={p.provider} value={p.provider}>{p.provider} ({p.category})</option>
                                    ))}
                                </select>
                            </label>
                            <button onClick={() => void handleCreate()} disabled={creating} className="text-sm bg-primary text-white px-3 py-1.5 rounded hover:opacity-90 disabled:opacity-50">
                                {creating ? 'Creating...' : 'Create'}
                            </button>
                            <button onClick={() => setShowCreate(false)} className="text-sm border border-border-strong px-3 py-1.5 rounded hover:bg-surface-secondary">
                                Cancel
                            </button>
                        </div>
                    )}

                    {configs.map(config => (
                        <div key={config.id} className="flex items-center justify-between p-3 bg-surface-secondary rounded mb-2">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm">{config.provider}</span>
                                    {statusBadge(config.status)}
                                    <span className="text-xs text-text-muted">({config.category})</span>
                                </div>
                                <div className="text-xs text-text-muted mt-1">
                                    Rate limit: {config.rateLimitRpm} rpm · Errors: {config.errorCount}
                                    {config.lastSyncAt && ` · Last sync: ${new Date(config.lastSyncAt).toLocaleDateString()}`}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => void toggleKillSwitch(config.id, config.killSwitch)} className={`text-xs px-2 py-1 rounded ${config.killSwitch ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                    {config.killSwitch ? 'Kill ON' : 'Kill OFF'}
                                </button>
                                <button onClick={() => void toggleActive(config.id, config.status)} className="text-xs px-2 py-1 rounded border border-border-strong hover:bg-surface-secondary">
                                    {config.status === 'active' ? 'Disable' : 'Enable'}
                                </button>
                            </div>
                        </div>
                    ))}

                    {configs.length === 0 && !loading && (
                        <p className="text-text-muted text-sm">No integrations configured. Add a provider to get started.</p>
                    )}
                </>
            )}

            {activeTab === 'executions' && (
                <>
                    {executions.map(exec => (
                        <div key={exec.id} className="p-3 bg-surface-secondary rounded mb-2">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm">{exec.action}</span>
                                        {statusBadge(exec.status)}
                                    </div>
                                    <div className="text-xs text-text-muted mt-1">
                                        {new Date(exec.createdAt).toLocaleString()}
                                        {exec.retryCount > 0 && ` · Retries: ${exec.retryCount}`}
                                        {exec.error && ` · Error: ${exec.error}`}
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    {exec.status === 'pending_approval' && (
                                        <button onClick={() => void approveExecution(exec.id)} className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:opacity-90">
                                            Approve
                                        </button>
                                    )}
                                    {exec.status === 'approved' && (
                                        <button onClick={() => void executeAction(exec.id)} className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:opacity-90">
                                            Execute
                                        </button>
                                    )}
                                    {['pending_approval', 'approved'].includes(exec.status) && (
                                        <button onClick={() => void cancelExecution(exec.id)} className="text-xs border border-border-strong px-2 py-1 rounded hover:bg-surface-secondary">
                                            Cancel
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {executions.length === 0 && !loading && (
                        <p className="text-text-muted text-sm">No executions yet.</p>
                    )}
                </>
            )}
        </section>
    );
}
