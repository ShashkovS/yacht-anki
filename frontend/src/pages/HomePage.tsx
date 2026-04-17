/*
This file shows the public landing page for the yacht training app.
Edit this file when the first page copy, branding, or public call to action changes.
Copy this file as a starting point when you add another public-facing page.
*/

import { Link } from "react-router-dom";
import { ResponsiveDiagram, exampleDiagramSpec } from "../features/diagram";

export function HomePage() {
  return (
    <section className="grid gap-6 lg:grid-cols-[1.35fr_0.95fr]">
      <div className="overflow-hidden rounded-[2.25rem] bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.22),transparent_28%),linear-gradient(140deg,#082f49_0%,#0f766e_58%,#155e75_100%)] px-8 py-10 text-white shadow-[0_30px_90px_rgba(8,47,73,0.28)]">
        <p className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm">Fareast 28R • интервальное повторение</p>
        <h2 className="mt-5 max-w-3xl text-4xl font-semibold leading-tight tracking-tight">
          Яхтенный тренажёр для терминов, манёвров и правил расхождения.
        </h2>
        <p className="mt-5 max-w-2xl text-base leading-7 text-sky-50/90">
          В приложении уже есть встроенные колоды по терминам, манёврам и правилам расхождения, а прогресс пользователя сохраняется между сессиями.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="rounded-full bg-amber-300 px-5 py-3 font-semibold text-slate-950 transition hover:bg-amber-200" to="/login">
            Войти в приложение
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        <article className="rounded-[2rem] border border-slate-200/80 bg-white/92 p-6 shadow-lg shadow-slate-200/60">
          <h3 className="text-xl font-semibold text-slate-950">Как будут выглядеть сцены</h3>
          <p className="mt-3 text-sm leading-7 text-slate-700">
            Движок диаграмм уже умеет рисовать ветер, лодки, паруса, знак и базовые rule-overlay для будущих карточек.
          </p>
          <div className="mt-4">
            <ResponsiveDiagram className="w-full" diagramSpec={exampleDiagramSpec} minHeight={280} />
          </div>
        </article>
      </div>
    </section>
  );
}
