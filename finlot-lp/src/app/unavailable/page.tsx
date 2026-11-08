import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Предложение недоступно',
    robots: { index: false, follow: false, noarchive: true, nosnippet: true, noimageindex: true },
};

export default function Page() {
    return (
        <main className="page">
            <section className="card hero not-found">
                <p className="eyebrow">Недоступно</p>
                <h1>Предложение недоступно для этого номера</h1>
            </section>
        </main>
    );
}
