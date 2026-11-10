/** Возраст заёмщика из полей оффера age_from / age_to в Strapi. */
export interface BorrowerAge {
    from: number;
    to: number | null;
}

export function borrowerAgeFrom(ageFrom?: number | null, ageTo?: number | null): BorrowerAge | null {
    if (ageFrom == null) return null;
    return { from: ageFrom, to: ageTo != null && ageTo > ageFrom ? ageTo : null };
}

export function borrowerAgeLabel(age: BorrowerAge): string {
    if (age.to) return `${age.from}–${age.to} лет`;
    // «от 21 года», но «от 18 лет»: после «от» — родительный падеж.
    const word = age.from % 10 === 1 && age.from % 100 !== 11 ? 'года' : 'лет';
    return `от ${age.from} ${word}`;
}
