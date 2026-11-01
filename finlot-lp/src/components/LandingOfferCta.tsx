'use client';

import type { LandingTrackingParams } from '@/lib/landingTracking';
import { trackedOfferUrl } from '@/lib/offerLink';
import type { Offer } from '@/lib/offers';

export default function LandingOfferCta({
    offer,
    trackingParams = {},
    className = '',
}: {
    offer: Offer;
    trackingParams?: LandingTrackingParams;
    className?: string;
}) {
    return (
        <a
            href={trackedOfferUrl(offer, trackingParams)}
            target="_blank"
            rel="noopener noreferrer nofollow sponsored"
            className={`button-primary ${className}`}
        >
            Получить
            <span aria-hidden="true">→</span>
        </a>
    );
}
