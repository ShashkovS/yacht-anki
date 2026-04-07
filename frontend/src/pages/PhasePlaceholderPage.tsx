/*
This file shows simple authenticated placeholders for future sections like stats and settings.
Edit this file when placeholder copy or layout changes before the real page lands.
Copy this file when you need another guarded placeholder page.
*/

type PhasePlaceholderPageProps = {
  title: string;
};

export function PhasePlaceholderPage({ title }: PhasePlaceholderPageProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-3xl font-semibold tracking-tight text-slate-950">{title}</h2>
      <article className="rounded-[2rem] border border-slate-200/80 bg-white/92 p-6 shadow-lg shadow-slate-200/60">
        <p className="text-base leading-7 text-slate-700">Этот экран появится в фазе 07. Маршрут уже работает и защищён авторизацией.</p>
      </article>
    </section>
  );
}
