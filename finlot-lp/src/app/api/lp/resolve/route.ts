import { NextResponse } from 'next/server';
import { authServiceFor } from '@/lib/authConfig';
import { getOffers } from '@/lib/offers';
import { trackedOfferUrl } from '@/lib/offerLink';

export const dynamic = 'force-dynamic';

interface ResolveBody {
    serviceKey?: string;
    token?: string;
    offerDocumentId?: string;
    attribution?: Record<string, string>;
}

function normalizePhone(phone: string): string | null {
    const digits = phone.replace(/\D+/g, '');
    if (digits.length === 11 && digits.startsWith('8')) return `7${digits.slice(1)}`;
    if (digits.length === 10) return `7${digits}`;
    if (digits.length >= 11) return digits;
    return null;
}

function isRussianPhone(phone: string): boolean {
    const normalized = normalizePhone(phone);
    return normalized?.length === 11 && normalized.startsWith('7');
}

function reviewPhones(): string[] {
    return (process.env.LP_REVIEW_PHONES ?? '')
        .split(',')
        .map(normalizePhone)
        .filter((phone): phone is string => Boolean(phone));
}

export async function POST(request: Request) {
    let body: ResolveBody;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
    }

    const service = authServiceFor(body.serviceKey === 'finbot' ? 'finbotapp' : 'netfinbankapp');
    if (!body.token || !body.offerDocumentId) {
        return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
    }

    const userResponse = await fetch(`${service.apiUrl}/api/user/me`, {
        headers: { Authorization: `Bearer ${body.token}`, Accept: 'application/json' },
        cache: 'no-store',
        signal: AbortSignal.timeout(10_000),
    });
    if (!userResponse.ok) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    const user = await userResponse.json() as { phone?: string };
    const phone = normalizePhone(user.phone ?? '');
    const fallbackUrl = process.env.LP_NON_RU_FALLBACK_URL || '/unavailable';

    if (!phone || reviewPhones().includes(phone) || !isRussianPhone(phone)) {
        return NextResponse.json({ url: fallbackUrl });
    }

    const offer = (await getOffers()).find((item) => item.documentId === body.offerDocumentId);
    if (!offer) {
        return NextResponse.json({ error: 'offer_not_found' }, { status: 404 });
    }

    const clickResponse = await fetch(`${service.apiUrl}/api/leads/click`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${body.token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        body: JSON.stringify({
            deviceId: request.headers.get('x-finlot-device-id') ?? '',
            network: offer.source === 'leads_su' ? 'leads_su' : 'leadgid',
            offerDocumentId: offer.documentId,
            offerExternalId: offer.external_id ?? (offer.legacy_id != null ? String(offer.legacy_id) : undefined),
            offerName: offer.display_name,
            platform: 'web',
            build: 'global',
            placement: 'offer_card',
            attribution: body.attribution ?? {},
        }),
        signal: AbortSignal.timeout(10_000),
    });
    if (!clickResponse.ok) {
        return NextResponse.json({ error: 'click_registration_failed' }, { status: 502 });
    }
    const click = await clickResponse.json() as { subids?: Record<string, string> };

    return NextResponse.json({ url: trackedOfferUrl(offer, click.subids ?? {}) });
}
