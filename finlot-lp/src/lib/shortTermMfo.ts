import type { Offer } from '@/lib/offers';

export const SHORT_TERM_MFO_DAYS = 61;

export interface LandingBrand {
    key: string;
    slug: string;
    name: string;
    offers: Offer[];
}

const BRAND_KEY_ALIASES: Record<string, string> = {
    'vivus.ru': 'vivus',
};

const TRANSLIT: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'j',
    к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
    х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

function slugify(value: string): string {
    return value
        .toLowerCase()
        .split('')
        .map((char) => TRANSLIT[char] ?? char)
        .join('')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function isMfoOffer(offer: Offer): boolean {
    return (offer.products || []).some((product) => {
        const name = (product.name || '').toLowerCase();
        return name.includes('мфо') || name.includes('микрокредит');
    });
}

function brandNameOf(displayName?: string): string {
    return (displayName || '').split(/\s*[—–-]\s+/)[0].trim();
}

function brandKeyOf(displayName?: string): string {
    const key = brandNameOf(displayName).toLowerCase();
    return BRAND_KEY_ALIASES[key] ?? key;
}

export function buildLandingBrands(offers: Offer[]): LandingBrand[] {
    const groups = new Map<string, Offer[]>();
    offers.forEach((offer) => {
        if (!isMfoOffer(offer)) return;
        const key = brandKeyOf(offer.display_name);
        if (!key) return;
        const list = groups.get(key) ?? [];
        list.push(offer);
        groups.set(key, list);
    });

    return [...groups.entries()].map(([key, brandOffers]) => {
        const named = brandOffers.find((offer) => brandNameOf(offer.display_name).toLowerCase() === key) ?? brandOffers[0];
        return {
            key,
            slug: key === 'манидэй' ? 'manidej-vydacha' : slugify(key),
            name: brandNameOf(named.display_name),
            offers: brandOffers,
        };
    });
}

export function shortTermMfoOffers(brand: LandingBrand): Offer[] {
    const terms = brand.offers.map((offer) => offer.term_to);
    if (terms.some((term) => term == null || term > SHORT_TERM_MFO_DAYS)) return [];
    return brand.offers;
}
