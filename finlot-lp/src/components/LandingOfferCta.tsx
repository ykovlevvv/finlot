'use client';

import { useState } from 'react';
import AuthGate from '@/components/AuthGate';
import { authServiceFor, NON_RU_FALLBACK_URL } from '@/lib/authConfig';
import {
    getStoredAuth,
    isRussianPhone,
    registerLeadClick,
    saveStoredAuth,
} from '@/lib/authApi';
import type { LandingTrackingParams } from '@/lib/landingTracking';
import { trackedOfferUrl } from '@/lib/offerLink';
import type { Offer } from '@/lib/offers';

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
    offer,
    trackingParams = {},
    className = '',
}: {
    offer: Offer;
    trackingParams?: LandingTrackingParams;
    className?: string;
}) {
    const service = authServiceFor(trackingParams.aff_sub1);
    const [authOpen, setAuthOpen] = useState(false);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const hasTrackedAppClick = Boolean(trackingParams.aff_sub2 && trackingParams.aff_sub3);

    const continueWithToken = async () => {
        const stored = getStoredAuth(service);
        if (!stored) {
            setAuthOpen(true);
            return;
        }

        if (!isRussianPhone(stored.phone)) {
            window.location.assign(NON_RU_FALLBACK_URL);
            return;
        }

        setPending(true);
        setError(null);
        try {
            if (hasTrackedAppClick) {
                window.location.assign(trackedOfferUrl(offer, trackingParams));
                return;
            }

            const click = await registerLeadClick(service, stored.token, offer, webAttribution());
            window.location.assign(trackedOfferUrl(offer, click.subids ?? {}));
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
