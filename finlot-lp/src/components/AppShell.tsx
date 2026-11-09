import type { ReactNode } from 'react';
import type { AppTheme } from '@/lib/appTheme';

/** Каркас экрана как в приложениях: шапка с брендом, колонка контента, нижняя панель с CTA. */
export default function AppShell({
    theme,
    children,
    footer,
}: {
    theme: AppTheme;
    children: ReactNode;
    footer?: ReactNode;
}) {
    return (
        <div className="app" data-app={theme.key}>
            <header className="topbar">
                <img src={theme.icon} alt="" width="32" height="32" className="topbar-icon" />
                <span className="topbar-name">{theme.name}</span>
            </header>
            <main className="screen">{children}</main>
            {footer && <div className="footer">{footer}</div>}
        </div>
    );
}
