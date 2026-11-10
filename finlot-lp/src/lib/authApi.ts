import type { AuthService } from '@/lib/authConfig';

export type CallStatus = 'pending' | 'confirmed' | 'expired';

interface StoredAuth {
    token: string;
    apiUrl: string;
}

const AUTH_STORAGE_PREFIX = 'finlot_auth_v1';
const DEVICE_ID_KEY = 'finlot_device_id_v1';
const PENDING_CALL_KEY = 'finlot_pending_call_v1';
const POLL_INTERVAL_MS = 3000;
/** ~5 минут опроса, как и окно ожидания звонка в SMS.ru. */
const POLL_ATTEMPTS = 100;
/** Подряд идущих сбоев сети/429, после которых сдаёмся. */
const MAX_TRANSIENT_FAILURES = 10;

export interface PendingCallAuth {
    serviceKey: AuthService['key'];
    phone: string;
    checkId: string;
    callPhonePretty: string;
    startedAt: number;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class AuthHttpError extends Error {
    constructor(public readonly status: number) {
        super(`Auth request failed: ${status}`);
    }
}

/** Сбой, после которого стоит повторить запрос: сеть, 429, 5xx. */
function isTransient(error: unknown): boolean {
    if (!(error instanceof AuthHttpError)) return true;
    return error.status === 429 || error.status >= 500;
}

function storageKey(service: AuthService): string {
    return `${AUTH_STORAGE_PREFIX}:${service.key}`;
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...init,
    });
    if (!response.ok) throw new AuthHttpError(response.status);
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

export function getPendingCall(service: AuthService): PendingCallAuth | null {
    try {
        const raw = localStorage.getItem(PENDING_CALL_KEY);
        if (!raw) return null;
        const pending = JSON.parse(raw) as PendingCallAuth;
        if (pending.serviceKey !== service.key || !pending.checkId || !pending.phone) return null;
        return pending;
    } catch {
        return null;
    }
}

export function savePendingCall(pending: PendingCallAuth): void {
    localStorage.setItem(PENDING_CALL_KEY, JSON.stringify(pending));
}

export function clearPendingCall(): void {
    localStorage.removeItem(PENDING_CALL_KEY);
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
        // source учитывается бэкендом только при создании пользователя.
        body: JSON.stringify({ checkId, source: 'lp' }),
    });
}

export async function awaitCallToken(
    service: AuthService,
    checkId: string,
    handlers: { signal?: AbortSignal; checkNow?: () => boolean } = {},
): Promise<string> {
    const { signal, checkNow } = handlers;
    let failures = 0;

    for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
        if (signal?.aborted) throw new Error('aborted');
        const start = Date.now();
        while (Date.now() - start < POLL_INTERVAL_MS) {
            if (checkNow?.()) break;
            if (signal?.aborted) throw new Error('aborted');
            await delay(150);
        }

        // Сеть после возврата из звонилки и 429 бывают разовыми: не обрываем опрос.
        let status: CallStatus;
        try {
            ({ status } = await getStatus(service.apiUrl, checkId));
            failures = 0;
        } catch (error) {
            if (!isTransient(error) || ++failures >= MAX_TRANSIENT_FAILURES) throw error;
            continue;
        }
        if (status === 'confirmed') return fetchTokenWithRetry(service, checkId, signal);
        if (status === 'expired') throw new Error('expired');
    }

    throw new Error('timeout');
}

async function fetchTokenWithRetry(service: AuthService, checkId: string, signal?: AbortSignal): Promise<string> {
    for (let attempt = 1; ; attempt++) {
        if (signal?.aborted) throw new Error('aborted');
        try {
            return (await getToken(service.apiUrl, checkId)).token;
        } catch (error) {
            if (!isTransient(error) || attempt >= 5) throw error;
            await delay(POLL_INTERVAL_MS);
        }
    }
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
    return awaitCallToken(service, checkId, { signal, checkNow });
}
