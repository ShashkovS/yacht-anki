/*
This file shows the authenticated study statistics dashboard for one user.
Edit this file when stats layout, stat loading, or stats copy changes.
Copy this file as a starting point when you add another analytics-heavy page.
*/

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../app/auth";
import { useOfflineStatus } from "../app/offline";
import { postJson } from "../shared/api";
import { loadApiSnapshot, saveApiSnapshot } from "../shared/offlineStore";
import { syncPendingReviewEvents } from "../shared/offlineSync";
import type { RatingDistributionPoint, StatsResponse } from "../shared/types";

const RATING_LABELS: Record<RatingDistributionPoint["rating"], string> = {
  1: "Again",
  2: "Hard",
  3: "Good",
  4: "Easy",
};

function formatAverageRating(value: number | null): string {
  if (value === null) {
    return "—";
  }
  return value.toFixed(2);
}

export function StatsPage() {
  const { user } = useAuth();
  const { isOnline } = useOfflineStatus();
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadedFromCache, setLoadedFromCache] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    setLoadedFromCache(false);
    const snapshotKey = `stats:${user.username}`;
    (async () => {
      try {
        if (isOnline) {
          await syncPendingReviewEvents(user.username);
        }
        const data = await postJson<StatsResponse>("/stats/get");
        await saveApiSnapshot(snapshotKey, data);
        if (!cancelled) {
          setStats(data);
        }
      } catch (loadError) {
        const cached = await loadApiSnapshot<StatsResponse>(snapshotKey);
        if (cached) {
          if (!cancelled) {
            setStats(cached);
            setLoadedFromCache(true);
          }
          return;
        }
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить статистику.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOnline, user]);

  if (loading) {
    return <p className="text-slate-600">Загружаем статистику...</p>;
  }

  if (error || !stats) {
    return <div className="rounded-[1.75rem] border border-rose-200 bg-rose-50 px-5 py-5 text-rose-900">{error || "Статистика недоступна."}</div>;
  }

  const maxActivityCount = Math.max(...stats.activity_30d.map((point) => point.review_count), 1);
  const maxRatingCount = Math.max(...stats.rating_distribution_30d.map((point) => point.count), 1);

  return (
    <section className="space-y-6">
      <div className="rounded-[2rem] border border-sky-950/10 bg-[linear-gradient(135deg,rgba(8,47,73,0.96),rgba(14,116,144,0.9))] p-8 text-white shadow-[0_24px_80px_rgba(8,47,73,0.24)]">
        <p className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm">Статистика обучения</p>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight">Статистика</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-sky-50/90">Здесь видно, сколько повторений вы сделали, как меняются ответы по дням и какие карточки чаще всего дают Again.</p>
      </div>
      {loadedFromCache ? <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">Показана последняя сохранённая статистика. Для обновления нужна сеть.</p> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-6 shadow-lg shadow-slate-200/60">
          <h3 className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Сегодня</h3>
          <p className="mt-4 text-4xl font-semibold text-slate-950">{stats.today.review_count}</p>
          <p className="mt-2 text-sm text-slate-600">Средний рейтинг: {formatAverageRating(stats.today.average_rating)}</p>
        </article>
        <article className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-6 shadow-lg shadow-slate-200/60">
          <h3 className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Серия</h3>
          <p className="mt-4 text-4xl font-semibold text-slate-950">{stats.streak_days}</p>
          <p className="mt-2 text-sm text-slate-600">дней подряд с повторениями</p>
        </article>
        <article className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-6 shadow-lg shadow-slate-200/60">
          <h3 className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Изучено</h3>
          <p className="mt-4 text-4xl font-semibold text-slate-950">{stats.studied_cards_count}</p>
          <p className="mt-2 text-sm text-slate-600">карточек с хотя бы одним review</p>
        </article>
        <article className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-6 shadow-lg shadow-slate-200/60">
          <h3 className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">В review</h3>
          <p className="mt-4 text-4xl font-semibold text-slate-950">{stats.overall_progress.review_cards}</p>
          <p className="mt-2 text-sm text-slate-600">{stats.overall_progress.percent_review.toFixed(1)}% от всех карточек</p>
        </article>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <article className="rounded-[2rem] border border-slate-200/80 bg-white/92 p-6 shadow-lg shadow-slate-200/60">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-slate-950">Активность за 30 дней</h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">Каждый столбец показывает, сколько review-ответов было в конкретный день по UTC.</p>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700">{stats.activity_30d.length} дней</span>
          </div>
          <div className="mt-6 flex h-64 items-end gap-2 overflow-x-auto pb-2">
            {stats.activity_30d.map((point) => {
              const heightPercent = point.review_count === 0 ? 4 : Math.max(10, Math.round((point.review_count / maxActivityCount) * 100));
              return (
                <div key={point.day} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <div className="text-xs text-slate-500">{point.review_count}</div>
                  <div className="flex w-full items-end justify-center rounded-t-2xl bg-slate-100" style={{ height: "12rem" }}>
                    <div className="w-full rounded-t-2xl bg-[linear-gradient(180deg,#0f766e,#0c4a6e)]" style={{ height: `${heightPercent}%` }} title={`${point.day}: ${point.review_count}`} />
                  </div>
                  <div className="text-[11px] text-slate-500">{point.day.slice(5)}</div>
                </div>
              );
            })}
          </div>
        </article>

        <article className="rounded-[2rem] border border-slate-200/80 bg-white/92 p-6 shadow-lg shadow-slate-200/60">
          <h3 className="text-xl font-semibold text-slate-950">Распределение ответов</h3>
          <div className="mt-5 space-y-4">
            {stats.rating_distribution_30d.map((point) => (
              <div key={point.rating} className="space-y-2">
                <div className="flex items-center justify-between text-sm text-slate-700">
                  <span className="font-medium text-slate-900">{RATING_LABELS[point.rating]}</span>
                  <span>{point.count}</span>
                </div>
                <div className="h-3 rounded-full bg-slate-100">
                  <div
                    className="h-3 rounded-full bg-[linear-gradient(90deg,#0f766e,#0891b2)]"
                    style={{ width: `${point.count === 0 ? 0 : Math.max(8, Math.round((point.count / maxRatingCount) * 100))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-[1.5rem] bg-slate-50 px-4 py-4 text-sm text-slate-700">
            <p>
              Дошло до review:{" "}
              <strong>
                {stats.overall_progress.review_cards} / {stats.overall_progress.total_cards}
              </strong>
            </p>
          </div>
        </article>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-[2rem] border border-slate-200/80 bg-white/92 p-6 shadow-lg shadow-slate-200/60">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-slate-950">Самые сложные карточки</h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">Топ карточек, которые чаще всего получают Again.</p>
            </div>
            <Link className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50" to="/review">
              Открыть review
            </Link>
          </div>
          {stats.hardest_cards.length === 0 ? (
            <p className="mt-6 rounded-[1.5rem] bg-emerald-50 px-4 py-4 text-sm text-emerald-900">Пока нет карточек с Again. После первых review здесь появятся реальные проблемные темы.</p>
          ) : (
            <div className="mt-6 space-y-3">
              {stats.hardest_cards.map((card) => (
                <article key={card.card_id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{card.prompt}</p>
                      <p className="mt-2 text-sm text-slate-600">{card.deck_title}</p>
                    </div>
                    <Link className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-white" to={`/review?deck=${card.deck_slug}`}>
                      Учить колоду
                    </Link>
                  </div>
                  <div className="mt-3 flex gap-3 text-sm text-slate-700">
                    <span className="rounded-full bg-white px-3 py-1">Again: {card.again_count}</span>
                    <span className="rounded-full bg-white px-3 py-1">Всего review: {card.review_count}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </article>

        <article className="rounded-[2rem] border border-slate-200/80 bg-white/92 p-6 shadow-lg shadow-slate-200/60">
          <h3 className="text-xl font-semibold text-slate-950">Прогресс по колодам</h3>
          <div className="mt-5 space-y-4">
            {stats.deck_progress.map((deck) => {
              const percent = deck.total_cards > 0 ? Math.round((deck.review_cards / deck.total_cards) * 100) : 0;
              return (
                <div key={deck.deck_slug} className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-950">{deck.title}</p>
                    <Link className="text-sm font-medium text-teal-800 hover:text-teal-700" to={`/decks/${deck.deck_slug}`}>
                      Открыть
                    </Link>
                  </div>
                  <div className="mt-3 h-3 rounded-full bg-slate-200">
                    <div className="h-3 rounded-full bg-[linear-gradient(90deg,#0f766e,#0c4a6e)]" style={{ width: `${percent}%` }} />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-sm text-slate-700">
                    <div>Новых: {deck.new_cards}</div>
                    <div>Учится: {deck.learning_cards}</div>
                    <div>Review: {deck.review_cards}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      </div>
    </section>
  );
}
