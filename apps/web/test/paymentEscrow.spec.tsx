import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import EscrowDashboard from '../components/hire/EscrowDashboard';
import InvoiceManager from '../components/hire/InvoiceManager';
import WithdrawalForm from '../components/hire/WithdrawalForm';

describe('EscrowDashboard', () => {
    it('shows loading state', () => {
        const html = renderToStaticMarkup(<EscrowDashboard />);
        expect(html).toContain('Loading escrow');
    });
});

describe('InvoiceManager', () => {
    it('shows loading state', () => {
        const html = renderToStaticMarkup(<InvoiceManager />);
        expect(html).toContain('Loading invoices');
    });
});

describe('WithdrawalForm', () => {
    it('renders withdrawal form with minimum amount note', () => {
        const html = renderToStaticMarkup(<WithdrawalForm />);
        expect(html).toContain('Withdraw Funds');
        expect(html).toContain('50.00');
    });

    it('has amount input', () => {
        const html = renderToStaticMarkup(<WithdrawalForm />);
        expect(html).toContain('type="number"');
    });
});
