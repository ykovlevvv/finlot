import { permanentRedirect } from 'next/navigation';

type Props = {
    params: Promise<{ slug: string }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ params, searchParams }: Props) {
    const [{ slug }, query] = await Promise.all([params, searchParams]);
    const search = new URLSearchParams();

    Object.entries(query).forEach(([key, value]) => {
        const values = Array.isArray(value) ? value : [value];
        values.forEach((item) => {
            if (item) search.append(key, item);
        });
    });

    const suffix = search.size > 0 ? `?${search.toString()}` : '';
    permanentRedirect(`/mfo/${slug}${suffix}`);
}
