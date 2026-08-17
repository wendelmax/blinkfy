'use client';

import { useState } from 'react';
import { ApiError, apiFetch } from '../../lib/api';
import type { NfeSummary } from '../../lib/types';

const STATUS_LABELS: Record<string, string> = {
    pending: 'Pending',
    processing: 'Processing',
    authorized: 'Authorized',
    rejected: 'Rejected',
    cancelled: 'Cancelled',
    error: 'Error',
};

export function NfeDashboard() {
    const [summary, setSummary] = useState<NfeSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function loadSummary() {
        setLoading(true);
        setError('');
        try {
            setSummary(await apiFetch<NfeSummary>('/api/blinkfy/nfe/summary'));
        } catch (caught) {
            setError(caught instanceof ApiError ? caught.message : 'Could not load NF-e summary.');
        } finally { setLoading(false); }
    }

    return (
        <section className="p-5 border border-border-strong rounded-[10px]" aria-labelledby="nfe-heading">
            <h3 id="nfe-heading">NF-e Emissions (Nota Fiscal)</h3>
            <p className="text-sm text-text-muted mb-3">
                Electronic invoices for Brazilian tax compliance. NF-e is automatically created when invoices are marked as paid for Brazilian tax residences.
            </p>
            <button type="button" onClick={() => void loadSummary()} disabled={loading}>
                {loading ? 'Loading…' : 'View NF-e Summary'}
            </button>

            {error && <p role="alert" className="text-red-600 mt-2">{error}</p>}

            {summary && (
                <div className="mt-4 space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="p-3 bg-gray-50 rounded">
                            <span className="text-xs text-text-muted">Total</span>
                            <p className="text-lg font-semibold">{summary.totalEmissions}</p>
                        </div>
                        <div className="p-3 bg-green-50 rounded">
                            <span className="text-xs text-green-700">Authorized</span>
                            <p className="text-lg font-semibold text-green-700">{summary.authorized}</p>
                        </div>
                        <div className="p-3 bg-yellow-50 rounded">
                            <span className="text-xs text-yellow-700">Pending</span>
                            <p className="text-lg font-semibold text-yellow-700">{summary.pending}</p>
                        </div>
                        <div className="p-3 bg-red-50 rounded">
                            <span className="text-xs text-red-700">Rejected</span>
                            <p className="text-lg font-semibold text-red-700">{summary.rejected}</p>
                        </div>
                    </div>
                    <p className="text-sm">Total authorized: R$ {summary.totalAmountBrl.toFixed(2)} (USD {summary.totalAmountUsd.toFixed(2)})</p>

                    {summary.recentEmissions.length > 0 && (
                        <div>
                            <h4 className="text-sm font-medium mb-2">Recent Emissions</h4>
                            <ul className="space-y-1">
                                {summary.recentEmissions.map((e) => (
                                    <li key={e.id} className="text-sm flex justify-between">
                                        <span>{e.nfeNumber || 'N/A'} · {e.cnaeCode} · R$ {e.amountBrl.toFixed(2)}</span>
                                        <span className={e.status === 'authorized' ? 'text-green-600' : e.status === 'rejected' ? 'text-red-600' : 'text-yellow-600'}>
                                            {STATUS_LABELS[e.status] || e.status}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
