import Link from 'next/link';

export default function HomePage() {
    return (
        <main className="min-h-screen flex items-center justify-center">
            <div className="text-center max-w-md mx-auto px-6">
                <div className="mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4">
                        <span className="text-2xl font-bold text-white">B</span>
                    </div>
                </div>
                <h1 className="text-3xl font-bold tracking-tight mb-3">Blinkfy Hire</h1>
                <p className="text-text-muted mb-8">
                    Recruiting workspace for building confident hiring decisions.
                </p>
                <div className="flex flex-col gap-3">
                    <Link
                        href="/hire"
                        className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-primary text-white font-medium hover:bg-primary-hover transition-colors"
                    >
                        Open Blinkfy Hire
                    </Link>
                    <Link
                        href="/talent"
                        className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-surface border border-border text-text font-medium hover:bg-surface-alt transition-colors"
                    >
                        Open Blinkfy Talent
                    </Link>
                </div>
            </div>
        </main>
    );
}
