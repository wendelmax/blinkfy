import Link from 'next/link';

export default function HomePage() {
    return (
        <main>
            <h1>Blinkfy Hire</h1>
            <p>Recruiting workspace for building confident hiring decisions.</p>
            <Link href="/hire">Open Blinkfy Hire</Link>
        </main>
    );
}
