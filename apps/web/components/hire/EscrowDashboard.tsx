'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';

interface EscrowHold {
    id: string;
    amountUsd: number;
    currency: string;
    holdReason: string;
    releaseAt: string;
    daysRemaining: number;
}

interface EscrowSummary {
    totalHeldUsd: number;
    holdCount: number;
    nextReleaseDate: string | null;
    nextReleaseAmount: number;
    holds: EscrowHold[];
}

export default function EscrowDashboard() {
    const [summary, setSummary] = useState<EscrowSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        apiFetch<EscrowSummary>('/api/payment/escrow/summary')
            .then(setSummary)
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div role="status">Loading escrow...</div>;
    if (error) return <div role="alert">{error}</div>;
    if (!summary) return null;

    return (
        <section aria-labelledby="escrow-heading">
            <h2 id="escrow-heading">Escrow & Retention</h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '1rem' }}>
                <div className="card" style={{ textAlign: 'center' }}>
                    <small>Total Held</small>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                        ${summary.totalHeldUsd.toFixed(2)}
                    </div>
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                    <small>Active Holds</small>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{summary.holdCount}</div>
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                    <small>Next Release</small>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-success-text)' }}>
                        ${summary.nextReleaseAmount.toFixed(2)}
                    </div>
                    {summary.nextReleaseDate && (
                        <small>{new Date(summary.nextReleaseDate).toLocaleDateString()}</small>
                    )}
                </div>
            </div>

            {summary.holds.length > 0 && (
                <div style={{ marginTop: '1.25rem' }}>
                    <h3>Active Holds</h3>
                    <table style={{ marginTop: '0.5rem' }}>
                        <thead>
                            <tr>
                                <th>Amount</th>
                                <th>Reason</th>
                                <th>Release Date</th>
                                <th>Days Left</th>
                            </tr>
                        </thead>
                        <tbody>
                            {summary.holds.map((hold) => (
                                <tr key={hold.id}>
                                    <td style={{ fontWeight: 600 }}>${hold.amountUsd.toFixed(2)} {hold.currency}</td>
                                    <td>
                                        <span style={{
                                            padding: '0.125rem 0.5rem',
                                            borderRadius: 'var(--radius-sm)',
                                            background: hold.holdReason === 'success_fee' ? 'var(--color-primary-light)' : 'var(--color-warning)',
                                            fontSize: '0.75rem',
                                            fontWeight: 500,
                                        }}>
                                            {hold.holdReason === 'success_fee' ? 'Success Fee' : 'Retention (90d)'}
                                        </span>
                                    </td>
                                    <td>{new Date(hold.releaseAt).toLocaleDateString()}</td>
                                    <td>{hold.daysRemaining}d</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {summary.holds.length === 0 && (
                <p style={{ marginTop: '1rem', color: 'var(--color-text-muted)' }}>No active escrow holds.</p>
            )}
        </section>
    );
}
