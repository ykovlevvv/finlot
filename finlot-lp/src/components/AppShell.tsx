import type { ReactNode } from 'react';
import type { AppTheme } from '@/lib/appTheme';

/** Каркас экрана как в приложениях: колонка контента, нижняя панель с CTA. */
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
            <main className="screen">{children}</main>
            {footer && <div className="footer">{footer}</div>}
        </div>
    );
}
