'use client';

import Link from 'next/link';
import EscrowDashboard from '../../../components/hire/EscrowDashboard';
import InvoiceManager from '../../../components/hire/InvoiceManager';
import WithdrawalForm from '../../../components/hire/WithdrawalForm';

export default function PaymentsPage() {
    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem' }}>
            <nav style={{ marginBottom: '1.5rem' }}>
                <Link href="/hire">&larr; Back to Hire</Link>
            </nav>

            <h1>Payments & Escrow</h1>
            <p style={{ color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                Manage escrow holds, invoices, and fund withdrawals.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.5rem' }}>
                <EscrowDashboard />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <InvoiceManager />
                    <WithdrawalForm />
                </div>
            </div>
        </div>
    );
}
