import { unstable_cache } from 'next/cache';
import { borrowerAgeFrom, type BorrowerAge } from '@/lib/borrowerAge';

const API_URL = process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL.endsWith('/api')
        ? process.env.NEXT_PUBLIC_API_URL
        : `${process.env.NEXT_PUBLIC_API_URL}/api`
    : 'https://strapi.netfinbank.ru/api';

export interface Offer {
    id: number | string;
    documentId?: string;
    legacy_id?: number | string | null;
    external_id?: string | null;
    source?: string | null;
    display_name?: string;
    logo_url?: string | null;
    logo_url_square?: string | null;
    products?: { name?: string }[];
    custom_affiliate_link?: string | null;
    affiliate_link?: string | null;
    default_url?: string | null;
    amount_from?: number | null;
    amount_to?: number | null;
    rate_from?: number | null;
    rate_to?: number | null;
    term_from?: number | null;
    term_to?: number | null;
    /** Поля age_from / age_to оффера в Strapi. */
    borrower_age?: BorrowerAge | null;
    metrics?: { epc?: number | null };
    custom_position?: number | null;
    affiliate_status?: string | null;
}

async function fetchOffers(): Promise<Offer[]> {
    const all: Offer[] = [];
    let page = 1;

    while (true) {
        const response = await fetch(`${API_URL}/offers?pagination[page]=${page}&pagination[pageSize]=100`, {
            cache: 'no-store',
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(10_000),
        });
        if (!response.ok) throw new Error(`Failed to load offers: ${response.status}`);
        const json = await response.json();

        const items: Offer[] = (json.data || []).map((offer: any) => {
            const source = offer?.attributes ? { id: offer.id, ...offer.attributes } : offer;
            return {
                id: source.id,
                documentId: source.documentId,
                legacy_id: source.legacy_id ?? null,
                external_id: source.external_id ?? null,
                source: source.source ?? null,
                display_name: source.display_name,
                logo_url: source.logo_url ?? null,
                logo_url_square: source.logo_url_square ?? null,
                products: source.products || [],
                custom_affiliate_link: source.custom_affiliate_link ?? null,
                affiliate_link: source.affiliate_link ?? null,
                default_url: source.default_url ?? null,
                amount_from: source.amount_from ?? null,
                amount_to: source.amount_to ?? null,
                rate_from: source.rate_from ?? null,
                rate_to: source.rate_to ?? null,
                term_from: source.term_from ?? null,
                term_to: source.term_to ?? null,
                borrower_age: borrowerAgeFrom(source.age_from, source.age_to),
                metrics: source.metrics || {},
                custom_position: source.custom_position ?? null,
                affiliate_status: source.affiliate_status ?? null,
            };
        }).filter((offer: Offer) => offer.affiliate_status === 'approved');

        all.push(...items);
        if (page >= (json.meta?.pagination?.pageCount ?? page)) break;
        page += 1;
    }

    return all.sort((a, b) => {
        const positionA = a.custom_position ?? Number.POSITIVE_INFINITY;
        const positionB = b.custom_position ?? Number.POSITIVE_INFINITY;
        if (positionA !== positionB) return positionA - positionB;
        return (b.metrics?.epc ?? 0) - (a.metrics?.epc ?? 0);
    });
}

export const getOffers = unstable_cache(fetchOffers, ['finlot-lp-offers-v1'], { revalidate: 300 });
