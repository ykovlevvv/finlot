import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import MfoLanding from '@/components/MfoLanding';
import { landingTrackingParams, type LandingSearchParams } from '@/lib/landingTracking';
import { getOffers } from '@/lib/offers';
import { buildLandingBrands, shortTermMfoOffers } from '@/lib/shortTermMfo';

export const revalidate = 300;

type Props = {
    params: Promise<{ slug: string }>;
    searchParams: Promise<LandingSearchParams>;
};

async function loadLandingBrand(slug: string) {
    const brand = buildLandingBrands(await getOffers()).find((item) => item.slug === slug);
    return brand && shortTermMfoOffers(brand).length > 0 ? brand : null;
}

export async function generateStaticParams() {
    return buildLandingBrands(await getOffers())
        .filter((brand) => shortTermMfoOffers(brand).length > 0)
        .map((brand) => ({ slug: brand.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const brand = await loadLandingBrand((await params).slug);
    if (!brand) return {};

    return {
        title: `${brand.name} — займ онлайн`,
        description: `Условия займа ${brand.name} и переход к заявке на сайте МФО.`,
        alternates: { canonical: null },
        robots: {
            index: false,
            follow: false,
            noarchive: true,
            nosnippet: true,
            noimageindex: true,
        },
    };
}

export default async function Page({ params, searchParams }: Props) {
    const [{ slug }, query] = await Promise.all([params, searchParams]);
    const brand = await loadLandingBrand(slug);
    if (!brand) notFound();
    return <MfoLanding brand={brand} trackingParams={landingTrackingParams(query)} />;
}
