import Link from 'next/link';

export default function CheckoutCancelPage() {
    return (
        <div style={{ maxWidth: '600px', margin: '4rem auto', padding: '2rem', textAlign: 'center' }}>
            <h1>Checkout cancelled</h1>
            <p>No worries — you haven&apos;t been charged. You can try upgrading to Pro anytime.</p>
            <div style={{ marginTop: '2rem' }}>
                <Link href="/talent">Back to Talent Profile</Link>
            </div>
        </div>
    );
}
