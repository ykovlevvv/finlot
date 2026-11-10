import AppShell from '@/components/AppShell';
import Icon, { type IconName } from '@/components/Icon';
import LandingOfferCta from '@/components/LandingOfferCta';
import LoanCalculator from '@/components/LoanCalculator';
import { appThemeFor } from '@/lib/appTheme';
import { borrowerAgeLabel } from '@/lib/borrowerAge';
import type { LandingTrackingParams } from '@/lib/landingTracking';
import { shortTermMfoOffers, type LandingBrand } from '@/lib/shortTermMfo';

const amountLabel = (value: number) =>
    value >= 1_000_000
        ? `до ${String(Math.round((value / 1_000_000) * 10) / 10).replace('.', ',')} млн ₽`
        : value >= 1000
          ? `до ${Math.round(value / 1000)} тыс ₽`
          : `до ${value.toLocaleString('ru-RU')} ₽`;


// Как в карточке оффера приложения: типовой процесс, без обещаний по конкретной МФО.
const STEPS: { label: string; sub: string; icon: IconName }[] = [
    { label: 'Заявка', sub: 'онлайн', icon: 'clipboard' },
    { label: 'Решение', sub: 'от 15 мин', icon: 'flash' },
    { label: 'Договор', sub: 'эл. подпись', icon: 'check-circle' },
    { label: 'Получение', sub: 'на карту', icon: 'credit-card' },
];

export default function MfoLanding({
    brand,
    trackingParams = {},
}: {
    brand: LandingBrand;
    trackingParams?: LandingTrackingParams;
}) {
    const theme = appThemeFor(trackingParams.aff_sub1);
    const offers = shortTermMfoOffers(brand);
    const primaryOffer = offers[0];
    const maxAmount = Math.max(...offers.map((offer) => offer.amount_to ?? 0));
    const minRate = Math.min(...offers.map((offer) => offer.rate_from ?? Number.POSITIVE_INFINITY));
    // Возраст основного оффера, иначе первый распознанный у бренда.
    const age = [primaryOffer, ...offers].find((offer) => offer?.borrower_age)?.borrower_age ?? null;
    const logoUrl = primaryOffer?.logo_url_square || primaryOffer?.logo_url || null;

    const stats = [
        maxAmount > 0 && { label: 'Сумма', value: amountLabel(maxAmount) },
        Number.isFinite(minRate) && { label: 'Ставка', value: `от ${String(minRate).replace('.', ',')}%` },
        age && { label: 'Возраст', value: borrowerAgeLabel(age) },
    ].filter(Boolean) as { label: string; value: string }[];

    return (
        <AppShell
            theme={theme}
            footer={
                primaryOffer && (
                    <LandingOfferCta
                        offerRef={{ documentId: primaryOffer.documentId }}
                        trackingParams={trackingParams}
                        appIcon={theme.icon}
                    />
                )
            }
        >
            <section className="hero">
                <div className="logo-plate">
                    {logoUrl ? (
                        <img src={logoUrl} alt="" width="64" height="64" />
                    ) : (
                        <Icon name="bank" size={32} className="logo-fallback" />
                    )}
                </div>
                <p className="hero-type">Займ онлайн</p>
                <h1>{brand.name}</h1>
                {stats.length > 0 && (
                    <dl className="stats">
                        {stats.map((stat) => (
                            <div key={stat.label} className="stat">
                                <dd>{stat.value}</dd>
                                <dt>{stat.label}</dt>
                            </div>
                        ))}
                    </dl>
                )}
            </section>

            <section className="section" aria-labelledby="steps-title">
                <h2 id="steps-title" className="section-label">Как пройдёт оформление</h2>
                <div className="card">
                    <p className="steps-caption">Типичный процесс оформления у партнёров сервиса</p>
                    <ol className="steps">
                        {STEPS.map((step) => (
                            <li key={step.label} className="step">
                                <span className="icon-circle"><Icon name={step.icon} size={22} /></span>
                                <span className="step-label">{step.label}</span>
                                <span className="step-sub">{step.sub}</span>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            {primaryOffer && (
                <LoanCalculator
                    amountFrom={primaryOffer.amount_from}
                    amountTo={primaryOffer.amount_to}
                    rateFrom={primaryOffer.rate_from}
                    rateTo={primaryOffer.rate_to}
                />
            )}
        </AppShell>
    );
}
