export type LandingSearchParams = Record<string, string | string[] | undefined>;
export type LandingTrackingParams = Readonly<Record<string, string>>;

const SUBID_PARAM_RE = /^aff_sub(?:[1-9]|10)$/;

export function landingTrackingParams(searchParams: LandingSearchParams): LandingTrackingParams {
    const params: Record<string, string> = {};
    Object.entries(searchParams).forEach(([key, raw]) => {
        const value = Array.isArray(raw) ? raw[0] : raw;
        if (!SUBID_PARAM_RE.test(key) || !value) return;
        params[key] = value.slice(0, 128);
    });
    return params;
}
