'use client';

import { useState } from 'react';
import { apiFetch } from '../../lib/api';

interface WithdrawalResult {
    withdrawal: {
        id: string;
        amountUsd: number;
        status: string;
        createdAt: string;
    };
    escrowWarning: {
        heldUsd: number;
        nextRelease: string | null;
    } | null;
}

export default function WithdrawalForm() {
    const [amount, setAmount] = useState('');
    const [result, setResult] = useState<WithdrawalResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!amount) return;
        setLoading(true);
        setError(null);
        setResult(null);
        try {
            const res = await apiFetch<WithdrawalResult>('/api/payment/withdraw', {
                method: 'POST',
                body: JSON.stringify({ amountUsd: parseFloat(amount) }),
            });
            setResult(res);
            setAmount('');
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <section aria-labelledby="withdraw-heading">
            <h2 id="withdraw-heading">Withdraw Funds</h2>

            <div className="card" style={{ marginTop: '1rem' }}>
                <label>
                    Amount (USD)
                    <input
                        type="number"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        min="50"
                        step="0.01"
                    />
                </label>
                <small>Minimum withdrawal: $50.00</small>

                <button
                    onClick={handleSubmit}
                    disabled={loading || !amount}
                    style={{ marginTop: '0.75rem' }}
                >
                    {loading ? 'Processing...' : 'Request Withdrawal'}
                </button>

                {error && (
                    <div role="alert" style={{ marginTop: '0.75rem' }}>{error}</div>
                )}

                {result && (
                    <div role="status" style={{ marginTop: '0.75rem' }}>
                        <p>Withdrawal of ${result.withdrawal.amountUsd.toFixed(2)} requested.</p>
                        <p>Status: {result.withdrawal.status}</p>
                        {result.escrowWarning && (
                            <p style={{ marginTop: '0.5rem' }}>
                                Note: ${result.escrowWarning.heldUsd.toFixed(2)} is held in escrow.
                                {result.escrowWarning.nextRelease && (
                                    <> Next release: {new Date(result.escrowWarning.nextRelease).toLocaleDateString()}</>
                                )}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}
