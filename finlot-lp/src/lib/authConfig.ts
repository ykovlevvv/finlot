export interface AuthService {
    key: 'finbot' | 'netfinbank';
    apiUrl: string;
}

export function authServiceFor(appTag?: string): AuthService {
    if (appTag === 'finbotapp') {
        return {
            key: 'finbot',
            apiUrl: process.env.NEXT_PUBLIC_FINBOT_AUTH_API_URL ?? 'https://backend.finbot.finance',
        };
    }
    return {
        key: 'netfinbank',
        apiUrl: process.env.NEXT_PUBLIC_NETFINBANK_AUTH_API_URL ?? 'https://backend.netfinbank.ru',
    };
}

export const NON_RU_FALLBACK_URL = process.env.NEXT_PUBLIC_NON_RU_FALLBACK_URL ?? '/unavailable';
