import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: {
        default: 'FINLOT',
        template: '%s | FINLOT',
    },
    robots: {
        index: false,
        follow: false,
        noarchive: true,
        nosnippet: true,
        noimageindex: true,
    },
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="ru">
            <body>{children}</body>
        </html>
    );
}
