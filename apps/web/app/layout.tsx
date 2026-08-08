import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
    title: 'Blinkfy Hire',
    description: 'Blinkfy Hire recruiting workspace',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
