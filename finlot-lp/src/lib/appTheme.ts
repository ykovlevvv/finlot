import { authServiceFor, type AuthService } from '@/lib/authConfig';

/**
 * Оформление LP под приложение, из которого пришёл пользователь (aff_sub1).
 * Дизайн-система у ФинБота и NETFINBANK общая, отличаются акцент, имя и иконка:
 * значения акцента — в globals.css под [data-app], источник — constants/Colors.ts приложений.
 */
export interface AppTheme {
    key: AuthService['key'];
    name: string;
    icon: string;
}

const THEMES: Record<AuthService['key'], AppTheme> = {
    finbot: { key: 'finbot', name: 'ФинБот', icon: '/apps/finbot.png' },
    netfinbank: { key: 'netfinbank', name: 'NETFINBANK', icon: '/apps/netfinbank.png' },
};

export function appThemeFor(appTag?: string): AppTheme {
    return THEMES[authServiceFor(appTag).key];
}

export const DEFAULT_APP_THEME = THEMES.netfinbank;
