import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
    title: 'Blinkfy Hire',
    description: 'Blinkfy Hire recruiting workspace',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
    return (
        <html lang="en">
            <body className="min-h-screen bg-surface-alt">{children}</body>
        </html>
    );
}
