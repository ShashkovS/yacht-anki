/*
This file shows the logged-in dashboard for the yacht training app.
Edit this file when the first logged-in overview or empty-state copy changes.
Copy this file as a starting point when you add another simple logged-in page.
*/

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../app/auth";
import { postJson } from "../shared/api";
import type { ReviewSummary } from "../shared/types";

export function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    postJson<ReviewSummary>("/review/summary")
      .then((data) => {
        if (!cancelled) {
          setSummary(data);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить сводку.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) {
    return null;
  }

  const hasCards = (summary?.due_count ?? 0) + (summary?.new_count ?? 0) > 0;

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-sky-950/10 bg-[linear-gradient(135deg,rgba(12,74,110,0.96),rgba(15,118,110,0.92))] p-8 text-white shadow-[0_24px_80px_rgba(12,74,110,0.28)]">
        <p className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm">Фаза 07</p>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight">Личный кабинет экипажа</h2>
        <p className="mt-3 max-w-2xl text-base leading-7 text-sky-50/90">
          Вы вошли как <strong>{user.username}</strong>. Здесь собрана сводка по текущему повторению, новым карточкам и прогрессу по колодам.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="rounded-full bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-slate-100" to="/review">
            Начать повторение
          </Link>
          <Link className="rounded-full border border-white/20 px-5 py-3 font-semibold text-white transition hover:bg-white/10" to="/decks">
            Открыть колоды
          </Link>
        </div>
      </div>

      {loading ? <p className="text-slate-600">Загружаем сводку...</p> : null}
      {error ? <div className="rounded-[1.75rem] border border-rose-200 bg-rose-50 px-5 py-5 text-rose-900">{error}</div> : null}
      {!loading && !error && summary ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-6 shadow-lg shadow-slate-200/60">
              <h3 className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">К повторению</h3>
              <p className="mt-4 text-4xl font-semibold text-slate-950">{summary.due_count}</p>
            </article>
            <article className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-6 shadow-lg shadow-slate-200/60">
              <h3 className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Новых</h3>
              <p className="mt-4 text-4xl font-semibold text-slate-950">{summary.new_count}</p>
            </article>
            <article className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-6 shadow-lg shadow-slate-200/60">
              <h3 className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Серия дней</h3>
              <p className="mt-4 text-4xl font-semibold text-slate-950">{summary.streak_days}</p>
            </article>
            <article className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-6 shadow-lg shadow-slate-200/60">
              <h3 className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Изучено</h3>
              <p className="mt-4 text-4xl font-semibold text-slate-950">{summary.studied_cards_count}</p>
            </article>
          </div>

          {!hasCards ? (
            <article className="rounded-[2rem] border border-emerald-200 bg-emerald-50/90 p-6 shadow-lg shadow-emerald-100/70">
              <h3 className="text-xl font-semibold text-slate-950">На сегодня всё</h3>
              <p className="mt-3 text-sm leading-7 text-slate-700">Очередь пуста. Можно открыть колоды и выбрать, что учить дальше.</p>
            </article>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            {summary.deck_progress.map((deck) => (
              <article key={deck.deck_slug} className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-6 shadow-lg shadow-slate-200/60">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-950">{deck.title}</h3>
                    <p className="mt-2 text-sm text-slate-600">{deck.total_cards} карт.</p>
                  </div>
                  <Link className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50" to={`/decks/${deck.deck_slug}`}>
                    Открыть
                  </Link>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-sm text-slate-700">
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">Новых: {deck.new_cards}</div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">Учится: {deck.learning_cards}</div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">Review: {deck.review_cards}</div>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
