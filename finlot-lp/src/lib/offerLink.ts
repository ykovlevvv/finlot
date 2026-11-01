import type { LandingTrackingParams } from '@/lib/landingTracking';
import type { Offer } from '@/lib/offers';

const SOURCE_SUBID = 'finlotsite';

function appendParam(url: string, key: string, value: string): string {
    if (!url || !value || !/^https?:\/\//i.test(url)) return url;
    const hashAt = url.indexOf('#');
    const base = hashAt === -1 ? url : url.slice(0, hashAt);
    const hash = hashAt === -1 ? '' : url.slice(hashAt);
    if (new RegExp(`[?&]${key}=`).test(base)) return url;
    const separator = !base.includes('?') ? '?' : /[?&]$/.test(base) ? '' : '&';
    return `${base}${separator}${key}=${encodeURIComponent(value)}${hash}`;
}

export function offerTargetUrl(offer: Offer): string {
    return offer.custom_affiliate_link || offer.affiliate_link || offer.default_url || '#';
}

export function trackedOfferUrl(offer: Offer, params: LandingTrackingParams): string {
    let url = offerTargetUrl(offer);
    Object.entries(params).forEach(([key, value]) => {
        url = appendParam(url, key, value);
    });
    return params.aff_sub1 ? url : appendParam(url, 'aff_sub1', SOURCE_SUBID);
}
