'use client';

import { useState } from 'react';
import LandingOfferCta from '@/components/LandingOfferCta';
import type { LandingTrackingParams } from '@/lib/landingTracking';
import type { Offer } from '@/lib/offers';

const rub = (value: number) => `${Math.round(value).toLocaleString('ru-RU')} ₽`;
const percent = (value: number) => String(value).replace('.', ',');

export default function LoanCalculator({
    offer,
    trackingParams,
}: {
    offer: Offer;
    trackingParams?: LandingTrackingParams;
}) {
    const minAmount = Math.max(1, offer.amount_from ?? 1000);
    const maxAmount = Math.max(minAmount, offer.amount_to ?? minAmount);
    const [amount, setAmount] = useState(Math.min(maxAmount, Math.max(minAmount, 10_000)));

    const rateFrom = offer.rate_from ?? offer.rate_to ?? null;
    const rateTo = offer.rate_to ?? offer.rate_from ?? null;
    const isDailyRate = (rateTo ?? 0) <= 5;
    const dailyRateFrom = rateFrom == null ? null : isDailyRate ? rateFrom : rateFrom / 365;
    const dailyRateTo = rateTo == null ? null : isDailyRate ? rateTo : rateTo / 365;
    const interestFrom = dailyRateFrom == null ? null : (amount * dailyRateFrom) / 100;
    const interestTo = dailyRateTo == null ? null : (amount * dailyRateTo) / 100;
    const progress = maxAmount === minAmount ? 100 : ((amount - minAmount) / (maxAmount - minAmount)) * 100;

    return (
        <section className="card calculator" aria-labelledby="loan-calculator">
            <h2 id="loan-calculator">Калькулятор займа</h2>

            <div className="amount-row">
                <label htmlFor="loan-amount">Сумма займа</label>
                <output htmlFor="loan-amount">{rub(amount)}</output>
            </div>
            <input
                id="loan-amount"
                type="range"
                min={minAmount}
                max={maxAmount}
                step={minAmount >= 1000 ? 1000 : 100}
                value={amount}
                disabled={minAmount === maxAmount}
                onChange={(event) => setAmount(Number(event.target.value))}
                className="range"
                style={{ background: `linear-gradient(to right, var(--brand) ${progress}%, var(--surface-2) ${progress}%)` }}
            />
            <div className="range-labels">
                <span>{rub(minAmount)}</span>
                <span>{rub(maxAmount)}</span>
            </div>

            {rateFrom != null && rateTo != null && (
                <dl className="facts calculator-facts">
                    <div className="fact">
                        <dt>Ставка</dt>
                        <dd>
                            {rateFrom === rateTo
                                ? `${percent(rateFrom)}% ${isDailyRate ? 'в день' : 'годовых'}`
                                : `${percent(rateFrom)}–${percent(rateTo)}% ${isDailyRate ? 'в день' : 'годовых'}`}
                        </dd>
                    </div>
                    <div className="fact">
                        <dt>Проценты в день</dt>
                        <dd>
                            {interestFrom === interestTo
                                ? rub(interestFrom ?? 0)
                                : `${rub(interestFrom ?? 0)}–${rub(interestTo ?? 0)}`}
                        </dd>
                    </div>
                </dl>
            )}

            <p className="note">Ориентировочный расчёт по ставке из предложения. Точные условия указываются в одобрении.</p>
            <LandingOfferCta offer={offer} trackingParams={trackingParams} className="calculator-cta" />
        </section>
    );
}
