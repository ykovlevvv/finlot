/**
 * Возраст заёмщика из описания оффера в Strapi. Отдельного поля нет: возраст
 * пишется в партнёрском тексте в свободной форме («Возраст: от 18 до 75 лет»,
 * «Возраст 21-70», «граждан России от 20 до 75 лет»). Берём только
 * правдоподобные значения; не распознали — возвращаем null и не показываем.
 */
export interface BorrowerAge {
    from: number;
    to: number | null;
}

const NUM = '(\\d{2})';
const YEARS = '(?:\\s*(?:года?|лет))?';
const DASH = '\\s*(?:до|-|–|—)\\s*';

const RANGE = new RegExp(`${NUM}${YEARS}${DASH}${NUM}`, 'i');
const FROM = new RegExp(`(?:от|старше|с)\\s*${NUM}`, 'i');
// Без слова «возраст» — только явный диапазон в годах, чтобы не поймать дни или суммы.
const LOOSE_RANGE = new RegExp(`от\\s*${NUM}${YEARS}\\s*до\\s*${NUM}\\s*лет`, 'i');
const LOOSE_FROM = /старше\s*(\d{2})\s*лет/i;

function plainText(html: string): string {
    return html
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&[a-z]+;/gi, ' ')
        .replace(/\s+/g, ' ');
}

function valid(from: number, to: number | null): BorrowerAge | null {
    if (from < 18 || from > 30) return null;
    if (to != null && (to < 40 || to > 100 || to <= from)) return null;
    return { from, to };
}

export function parseBorrowerAge(description?: string | null): BorrowerAge | null {
    if (!description) return null;
    const text = plainText(description);

    const at = text.search(/возраст/i);
    if (at >= 0) {
        const near = text.slice(at, at + 90);
        const range = near.match(RANGE);
        if (range) {
            const age = valid(Number(range[1]), Number(range[2]));
            if (age) return age;
        }
        const from = near.match(FROM) ?? near.match(new RegExp(`возраст\\S*\\s*:?\\s*${NUM}`, 'i'));
        if (from) {
            const age = valid(Number(from[1]), null);
            if (age) return age;
        }
    }

    const loose = text.match(LOOSE_RANGE);
    if (loose) return valid(Number(loose[1]), Number(loose[2]));
    const older = text.match(LOOSE_FROM);
    if (older) return valid(Number(older[1]), null);
    return null;
}

export function borrowerAgeLabel(age: BorrowerAge): string {
    if (age.to) return `${age.from}–${age.to} лет`;
    // «от 21 года», но «от 18 лет»: после «от» — родительный падеж.
    const word = age.from % 10 === 1 && age.from % 100 !== 11 ? 'года' : 'лет';
    return `от ${age.from} ${word}`;
}
