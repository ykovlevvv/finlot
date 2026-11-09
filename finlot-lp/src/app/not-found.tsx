import AppShell from '@/components/AppShell';
import { DEFAULT_APP_THEME } from '@/lib/appTheme';

export default function NotFound() {
    return (
        <AppShell theme={DEFAULT_APP_THEME}>
            <section className="hero empty-state">
                <p className="hero-type">404</p>
                <h1>Страница не найдена</h1>
            </section>
        </AppShell>
    );
}
