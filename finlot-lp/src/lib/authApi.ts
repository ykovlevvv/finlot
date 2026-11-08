import type { AuthService } from '@/lib/authConfig';

export type CallStatus = 'pending' | 'confirmed' | 'expired';

interface StoredAuth {
    token: string;
    apiUrl: string;
}

const AUTH_STORAGE_PREFIX = 'finlot_auth_v1';
const DEVICE_ID_KEY = 'finlot_device_id_v1';
const POLL_INTERVAL_MS = 2000;
const POLL_ATTEMPTS = 30;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function storageKey(service: AuthService): string {
    return `${AUTH_STORAGE_PREFIX}:${service.key}`;
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...init,
    });
    if (!response.ok) throw new Error(`Auth request failed: ${response.status}`);
    return response.json() as Promise<T>;
}

function decodeJwt(token: string): { exp?: number; phone?: string; sub?: number } | null {
    try {
        const payload = token.split('.')[1];
        if (!payload) return null;
        return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    } catch {
        return null;
    }
}

function isTokenExpired(token: string): boolean {
    const payload = decodeJwt(token);
    if (!payload) return true;
    return typeof payload.exp === 'number' && Date.now() >= payload.exp * 1000;
}

export function getStoredAuth(service: AuthService): { token: string; phone: string | null } | null {
    try {
        const raw = localStorage.getItem(storageKey(service));
        if (!raw) return null;
        const stored = JSON.parse(raw) as StoredAuth;
        if (!stored.token || stored.apiUrl !== service.apiUrl || isTokenExpired(stored.token)) {
            localStorage.removeItem(storageKey(service));
            return null;
        }
        return { token: stored.token, phone: decodeJwt(stored.token)?.phone ?? null };
    } catch {
        return null;
    }
}

export function saveStoredAuth(service: AuthService, token: string): void {
    localStorage.setItem(storageKey(service), JSON.stringify({ token, apiUrl: service.apiUrl }));
}

export function getDeviceId(): string {
    try {
        const stored = localStorage.getItem(DEVICE_ID_KEY);
        if (stored) return stored;
        const value = crypto.randomUUID();
        localStorage.setItem(DEVICE_ID_KEY, value);
        return value;
    } catch {
        return `anon-${Date.now()}`;
    }
}

export function normalizePhone(phone: string): string | null {
    const digits = phone.replace(/\D+/g, '');
    if (digits.length === 11 && digits.startsWith('8')) return `7${digits.slice(1)}`;
    if (digits.length === 10) return `7${digits}`;
    if (digits.length >= 11) return digits;
    return null;
}

export function initCall(apiUrl: string, phone: string): Promise<{ checkId: string; callPhonePretty: string; confirmed?: boolean }> {
    return getJson(`${apiUrl}/api/auth/call/init`, {
        method: 'POST',
        body: JSON.stringify({ phone: phone.trim() }),
    });
}

export function getStatus(apiUrl: string, checkId: string): Promise<{ status: CallStatus }> {
    return getJson(`${apiUrl}/api/auth/call/status`, {
        method: 'POST',
        body: JSON.stringify({ checkId }),
    });
}

export function getToken(apiUrl: string, checkId: string): Promise<{ token: string }> {
    return getJson(`${apiUrl}/api/auth/call/check`, {
        method: 'POST',
        body: JSON.stringify({ checkId }),
    });
}

export async function requestCallAndAwaitToken(
    service: AuthService,
    phone: string,
    handlers: { onCallNumber?: (phone: string) => void; signal?: AbortSignal; checkNow?: () => boolean } = {},
): Promise<string> {
    const { onCallNumber, signal, checkNow } = handlers;
    const { checkId, callPhonePretty, confirmed } = await initCall(service.apiUrl, phone);

    if (confirmed) return (await getToken(service.apiUrl, checkId)).token;
    onCallNumber?.(callPhonePretty);

    for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
        if (signal?.aborted) throw new Error('aborted');
        const start = Date.now();
        while (Date.now() - start < POLL_INTERVAL_MS) {
            if (checkNow?.()) break;
            if (signal?.aborted) throw new Error('aborted');
            await delay(150);
        }

        const { status } = await getStatus(service.apiUrl, checkId);
        if (status === 'confirmed') return (await getToken(service.apiUrl, checkId)).token;
        if (status === 'expired') throw new Error('expired');
    }

    throw new Error('timeout');
}
