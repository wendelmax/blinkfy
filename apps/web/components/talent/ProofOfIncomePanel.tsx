'use client';

import { useState } from 'react';
import { ApiError, apiFetch } from '../../lib/api';

const PERIOD_OPTIONS = [
    { value: '3m', label: '3 months' },
    { value: '6m', label: '6 months' },
    { value: '12m', label: '12 months' },
];

interface IncomeHistory {
    candidate: { name: string; email: string; taxResidence: string };
    period: { months: number; start: string; end: string };
    summary: {
        totalIncomeUsd: number;
        totalIncomeBrl: number;
        totalWithdrawalsUsd: number;
        netIncomeUsd: number;
        transactionCount: number;
        invoiceCount: number;
        avgExchangeRate: number | null;
    };
}

export function ProofOfIncomePanel() {
    const [period, setPeriod] = useState('6m');
    const [history, setHistory] = useState<IncomeHistory | null>(null);
    const [loading, setLoading] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [error, setError] = useState('');

    async function loadHistory() {
        setLoading(true);
        setError('');
        try {
            setHistory(await apiFetch<IncomeHistory>(`/api/blinkfy/candidate/proof-of-income/history?period=${period}`));
        } catch (caught) {
            setError(caught instanceof ApiError ? caught.message : 'Could not load income history.');
        } finally { setLoading(false); }
    }

    async function downloadPdf() {
        setDownloading(true);
        setError('');
        try {
            const response = await fetch(`/api/blinkfy/candidate/proof-of-income?period=${period}`, {
                headers: { Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('blinkfy_access_token') || '' : ''}` },
            });
            if (!response.ok) throw new Error(`Download failed: ${response.status}`);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `blinkfy-proof-of-income-${period}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : 'Download failed.');
        } finally { setDownloading(false); }
    }

    return (
        <section className="p-5 border border-border-strong rounded-[10px]" aria-labelledby="proof-of-income-heading">
            <h3 id="proof-of-income-heading">Proof of Income</h3>
            <p className="text-sm text-text-muted mb-3">
                Generate an auditable income declaration PDF with QR code validation. Useful for banking, housing, and credit applications.
            </p>

            <div className="flex gap-3 items-end mb-4">
                <div>
                    <label htmlFor="poi-period" className="text-sm">Period</label>
                    <select id="poi-period" value={period} onChange={(e) => setPeriod(e.target.value)} className="ml-2 border rounded px-2 py-1 text-sm">
                        {PERIOD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
                <button type="button" onClick={() => void loadHistory()} disabled={loading}>
                    {loading ? 'Loading…' : 'Preview'}
                </button>
                <button type="button" onClick={() => void downloadPdf()} disabled={downloading}>
                    {downloading ? 'Generating…' : 'Download PDF'}
                </button>
            </div>

            {error && <p role="alert" className="text-red-600 mt-2">{error}</p>}

            {history && (
                <div className="mt-4 space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div className="p-3 bg-gray-50 rounded">
                            <span className="text-xs text-text-muted">Income (USD)</span>
                            <p className="text-lg font-semibold">${history.summary.totalIncomeUsd.toFixed(2)}</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded">
                            <span className="text-xs text-text-muted">Income (BRL)</span>
                            <p className="text-lg font-semibold">R$ {history.summary.totalIncomeBrl.toFixed(2)}</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded">
                            <span className="text-xs text-text-muted">Net (USD)</span>
                            <p className="text-lg font-semibold">${history.summary.netIncomeUsd.toFixed(2)}</p>
                        </div>
                    </div>
                    <p className="text-sm text-text-muted">
                        {history.summary.transactionCount} transactions · {history.summary.invoiceCount} invoices · {history.period.start} to {history.period.end}
                    </p>
                    {history.summary.avgExchangeRate && (
                        <p className="text-sm text-text-muted">Avg exchange rate: {history.summary.avgExchangeRate.toFixed(4)} BRL/USD</p>
                    )}
                </div>
            )}
        </section>
    );
}
