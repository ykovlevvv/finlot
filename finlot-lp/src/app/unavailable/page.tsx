import AppShell from '@/components/AppShell';
import { DEFAULT_APP_THEME } from '@/lib/appTheme';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Предложение недоступно',
    robots: { index: false, follow: false, noarchive: true, nosnippet: true, noimageindex: true },
};

export default function Page() {
    return (
        <AppShell theme={DEFAULT_APP_THEME}>
            <section className="hero empty-state">
                <p className="hero-type">Недоступно</p>
                <h1>Предложение недоступно для этого номера</h1>
            </section>
        </AppShell>
    );
}
