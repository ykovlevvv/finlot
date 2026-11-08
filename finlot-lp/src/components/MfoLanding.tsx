import LandingOfferCta from '@/components/LandingOfferCta';
import LoanCalculator from '@/components/LoanCalculator';
import type { LandingTrackingParams } from '@/lib/landingTracking';
import { shortTermMfoOffers, type LandingBrand } from '@/lib/shortTermMfo';

const amountLabel = (value: number) =>
    value >= 1_000_000
        ? `до ${String(Math.round((value / 1_000_000) * 10) / 10).replace('.', ',')} млн ₽`
        : value >= 1000
          ? `до ${Math.round(value / 1000)} тыс ₽`
          : `до ${value.toLocaleString('ru-RU')} ₽`;

export default function MfoLanding({
    brand,
    trackingParams,
}: {
    brand: LandingBrand;
    trackingParams?: LandingTrackingParams;
}) {
    const offers = shortTermMfoOffers(brand);
    const primaryOffer = offers[0];
    const maxAmount = Math.max(...offers.map((offer) => offer.amount_to ?? 0));
    const minRate = Math.min(...offers.map((offer) => offer.rate_from ?? Number.POSITIVE_INFINITY));
    const logoUrl = primaryOffer?.logo_url_square || primaryOffer?.logo_url || null;

    return (
        <main className="page">
            <section className="card hero">
                <div className="brand-row">
                    {logoUrl ? (
                        <img src={logoUrl} alt="" className="brand-logo" width="64" height="64" />
                    ) : (
                        <span className="brand-fallback">{brand.name[0]}</span>
                    )}
                    <div>
                        <p className="eyebrow">Займ онлайн</p>
                        <h1>{brand.name}: займ онлайн</h1>
                    </div>
                </div>

                <dl className="facts">
                    {maxAmount > 0 && (
                        <div className="fact">
                            <dt>Сумма</dt>
                            <dd>{amountLabel(maxAmount)}</dd>
                        </div>
                    )}
                    {Number.isFinite(minRate) && (
                        <div className="fact">
                            <dt>Ставка</dt>
                            <dd>от {String(minRate).replace('.', ',')}%</dd>
                        </div>
                    )}
                </dl>

                {primaryOffer && (
                    <LandingOfferCta
                        offerRef={{ documentId: primaryOffer.documentId }}
                        trackingParams={trackingParams}
                        className="hero-cta"
                    />
                )}
            </section>

            {primaryOffer && (
                <LoanCalculator
                    amountFrom={primaryOffer.amount_from}
                    amountTo={primaryOffer.amount_to}
                    rateFrom={primaryOffer.rate_from}
                    rateTo={primaryOffer.rate_to}
                    offerRef={{ documentId: primaryOffer.documentId }}
                    trackingParams={trackingParams}
                />
            )}
        </main>
    );
}
