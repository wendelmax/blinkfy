'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';

interface Invoice {
    id: string;
    invoiceNumber: string;
    amountUsd: number;
    amountBrl: number | null;
    status: string;
    issuedAt: string | null;
    paidAt: string | null;
    createdAt: string;
}

interface InvoiceSummary {
    totalIssued: number;
    totalPaid: number;
    totalPending: number;
    invoiceCount: number;
    cnaeCode: string;
    recentInvoices: Invoice[];
}

export default function InvoiceManager() {
    const [summary, setSummary] = useState<InvoiceSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    const [createAmount, setCreateAmount] = useState('');

    const loadInvoices = () => {
        apiFetch<InvoiceSummary>('/api/payment/invoices/summary')
            .then(setSummary)
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    };

    useEffect(() => { loadInvoices(); }, []);

    const handleCreate = async () => {
        if (!createAmount) return;
        setCreating(true);
        try {
            await apiFetch('/api/payment/invoices', {
                method: 'POST',
                body: JSON.stringify({ amountUsd: parseFloat(createAmount) }),
            });
            setCreateAmount('');
            loadInvoices();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setCreating(false);
        }
    };

    const handleIssue = async (invoiceId: string) => {
        try {
            await apiFetch(`/api/payment/invoices/${invoiceId}/issue`, { method: 'POST' });
            loadInvoices();
        } catch (e: any) {
            setError(e.message);
        }
    };

    if (loading) return <div role="status">Loading invoices...</div>;
    if (error) return <div role="alert">{error}</div>;
    if (!summary) return null;

    const statusColor = (s: string) => {
        if (s === 'paid') return 'var(--color-success)';
        if (s === 'issued') return 'var(--color-warning)';
        if (s === 'void') return 'var(--color-danger)';
        return 'var(--color-surface-alt)';
    };

    return (
        <section aria-labelledby="invoices-heading">
            <h2 id="invoices-heading">Invoices</h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '1rem' }}>
                <div className="card" style={{ textAlign: 'center' }}>
                    <small>Total Issued</small>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>${summary.totalIssued.toFixed(2)}</div>
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                    <small>Total Paid</small>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-success-text)' }}>${summary.totalPaid.toFixed(2)}</div>
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                    <small>Pending</small>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-warning-text)' }}>${summary.totalPending.toFixed(2)}</div>
                </div>
            </div>

            <div className="card" style={{ marginTop: '1.25rem' }}>
                <h3>Create Invoice</h3>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <input
                        type="number"
                        placeholder="Amount USD"
                        value={createAmount}
                        onChange={(e) => setCreateAmount(e.target.value)}
                        min="0"
                        step="0.01"
                        style={{ flex: 1 }}
                    />
                    <button onClick={handleCreate} disabled={creating || !createAmount}>
                        {creating ? 'Creating...' : 'Create'}
                    </button>
                </div>
                <small>CNAE: {summary.cnaeCode} (Exportação de Serviços)</small>
            </div>

            {summary.recentInvoices.length > 0 && (
                <div style={{ marginTop: '1.25rem' }}>
                    <h3>Recent Invoices</h3>
                    <table style={{ marginTop: '0.5rem' }}>
                        <thead>
                            <tr>
                                <th>Number</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {summary.recentInvoices.map((inv) => (
                                <tr key={inv.id}>
                                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{inv.invoiceNumber}</td>
                                    <td style={{ fontWeight: 600 }}>${inv.amountUsd.toFixed(2)}</td>
                                    <td>
                                        <span style={{
                                            padding: '0.125rem 0.5rem',
                                            borderRadius: 'var(--radius-sm)',
                                            background: statusColor(inv.status),
                                            fontSize: '0.75rem',
                                            fontWeight: 500,
                                            textTransform: 'uppercase',
                                        }}>
                                            {inv.status}
                                        </span>
                                    </td>
                                    <td>{new Date(inv.createdAt).toLocaleDateString()}</td>
                                    <td>
                                        {inv.status === 'draft' && (
                                            <button type="button" onClick={() => handleIssue(inv.id)} style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>
                                                Issue
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
