'use client';

import { useEffect, useMemo, useState } from 'react';
import AuthGate from '@/components/AuthGate';
import { authServiceFor } from '@/lib/authConfig';
import { getDeviceId, getPendingCall, getStoredAuth, saveStoredAuth } from '@/lib/authApi';
import type { LandingTrackingParams } from '@/lib/landingTracking';

export interface LandingOfferRef {
    documentId?: string;
}

/**
 * На странице несколько кнопок «Получить». Незавершённую проверку звонком
 * подхватывает только одна, иначе два окна опрашивают один checkId и второе
 * ловит 401 «токен уже выдан».
 */
let pendingCallOwner: symbol | null = null;

function webAttribution(): Record<string, string> {
    if (typeof window === 'undefined') return {};
    const output: Record<string, string> = {};
    const params = new URLSearchParams(window.location.search);
    for (const key of ['ref', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'vk_user_id', 'rb_clickid']) {
        const value = params.get(key);
        if (value) output[key] = value.slice(0, 128);
    }
    try {
        const ymClientId = localStorage.getItem('ym_client_id');
        if (ymClientId) output.ym_client_id = ymClientId.slice(0, 128);
    } catch {}
    return output;
}

export default function LandingOfferCta({
    offerRef,
    trackingParams = {},
    className = '',
}: {
    offerRef: LandingOfferRef;
    trackingParams?: LandingTrackingParams;
    className?: string;
}) {
    // Стабильная ссылка: service в зависимостях эффектов AuthGate, новый объект
    // на каждом рендере перезапускал бы опрос статуса.
    const service = useMemo(() => authServiceFor(trackingParams.aff_sub1), [trackingParams.aff_sub1]);
    const [authOpen, setAuthOpen] = useState(false);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [instanceId] = useState(() => Symbol('landing-cta'));

    useEffect(() => {
        if (!getPendingCall(service)) return;
        if (pendingCallOwner && pendingCallOwner !== instanceId) return;
        pendingCallOwner = instanceId;
        setAuthOpen(true);
        return () => {
            if (pendingCallOwner === instanceId) pendingCallOwner = null;
        };
    }, [service, instanceId]);

    const continueWithToken = async () => {
        const stored = getStoredAuth(service);
        if (!stored || !offerRef.documentId) {
            setAuthOpen(true);
            return;
        }

        setPending(true);
        setError(null);
        try {
            const response = await fetch('/api/lp/resolve', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-finlot-device-id': getDeviceId(),
                },
                body: JSON.stringify({
                    serviceKey: service.key,
                    token: stored.token,
                    offerDocumentId: offerRef.documentId,
                    attribution: webAttribution(),
                }),
            });
            if (response.status === 401) {
                setAuthOpen(true);
                return;
            }
            if (!response.ok) throw new Error('resolve failed');
            const { url } = await response.json() as { url: string };
            window.location.assign(url);
        } catch {
            setError('Не удалось открыть предложение. Попробуйте ещё раз.');
            setPending(false);
        }
    };

    const handleAuthenticated = (token: string) => {
        saveStoredAuth(service, token);
        setAuthOpen(false);
        void continueWithToken();
    };

    return (
        <>
            <button
                type="button"
                className={`button-primary ${className}`}
                onClick={() => void continueWithToken()}
                disabled={pending}
            >
                {pending ? 'Переходим…' : 'Получить'}
                {!pending && <span aria-hidden="true">→</span>}
            </button>
            {error && <p className="cta-error">{error}</p>}
            {authOpen && (
                <AuthGate
                    service={service}
                    onAuthenticated={handleAuthenticated}
                    onClose={() => setAuthOpen(false)}
                />
            )}
        </>
    );
}
