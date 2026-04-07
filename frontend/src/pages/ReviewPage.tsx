/*
This file shows the active review session with reveal flow, diagrams, and FSRS ratings.
Edit this file when review page loading, card progression, or rating UX changes.
Copy this file as a starting point when you add another multi-step study page.
*/

import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../app/auth";
import { useOfflineStatus } from "../app/offline";
import { formatNextReview } from "../shared/fsrs";
import { loadReviewSession, submitCurrentReview, type ReviewSession } from "../shared/reviewSession";
import type { ReviewCard, ReviewRating } from "../shared/types";
import { ReviewCardView } from "../features/review/ReviewCardView";

const RATING_LABELS: Record<ReviewRating, string> = {
  1: "Не помню",
  2: "Сложно",
  3: "Хорошо",
  4: "Легко",
};
const REVIEW_RATINGS: ReviewRating[] = [1, 2, 3, 4];

export function ReviewPage() {
  const { user } = useAuth();
  const { isOnline, pendingReviewCount } = useOfflineStatus();
  const [searchParams] = useSearchParams();
  const deckSlug = searchParams.get("deck");
  const [session, setSession] = useState<ReviewSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [draftHeading, setDraftHeading] = useState<number | null>(null);
  const [selectedBoatId, setSelectedBoatId] = useState<string | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    setSession(null);
    loadReviewSession({ userKey: user.username, deckSlug: deckSlug ?? undefined })
      .then((nextSession) => {
        if (!cancelled) {
          setSession(nextSession);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить очередь повторения.");
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
  }, [deckSlug, user]);

  const currentCard = session?.items[session.currentIndex] ?? null;

  useEffect(() => {
    setRevealed(false);
    setSelectedBoatId(null);
    setSelectedOptionId(null);
    setDraftHeading(null);
  }, [currentCard?.id, currentCard?.template_type]);

  const finished = !loading && !error && !!session && currentCard === null;
  const title = deckSlug ? `Повторение колоды: ${deckSlug}` : "Повторение";

  const handleRate = async (rating: ReviewRating) => {
    if (!session) {
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const nextSession = await submitCurrentReview(session, rating, user?.username ?? "");
      setSession(nextSession);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Не удалось сохранить ответ.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRotateBoat = (_boatId: string, headingDeg: number) => {
    setDraftHeading(headingDeg);
  };

  if (loading) {
    return <p className="text-slate-600">Загружаем очередь повторения...</p>;
  }

  if (error) {
    return (
      <section className="space-y-4">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-950">{title}</h2>
        <div className="rounded-[1.75rem] border border-rose-200 bg-rose-50 px-5 py-5 text-rose-900">{error}</div>
      </section>
    );
  }

  if (!session || finished) {
    return (
      <section className="space-y-5">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-950">{title}</h2>
        <article className="rounded-[2rem] border border-emerald-200 bg-emerald-50/90 p-8 shadow-lg shadow-emerald-100/80">
          <h3 className="text-2xl font-semibold text-slate-950">Всё на сегодня!</h3>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-700">
            Очередь повторения пуста. Можно вернуться в кабинет или открыть список колод.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="rounded-full bg-slate-950 px-5 py-3 font-semibold text-white transition hover:bg-slate-800" to={deckSlug ? `/decks/${deckSlug}` : "/dashboard"}>
              {deckSlug ? "Назад к колоде" : "В кабинет"}
            </Link>
            <Link className="rounded-full border border-slate-300 px-5 py-3 font-semibold text-slate-900 transition hover:bg-white/70" to="/decks">
              Открыть колоды
            </Link>
          </div>
        </article>
      </section>
    );
  }

  const activeCard = currentCard;
  if (!activeCard) {
    return null;
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-950">{title}</h2>
          <p className="mt-2 text-sm text-slate-600">
            Карточка {session.currentIndex + 1} из {session.items.length}
          </p>
        </div>
        <div className="rounded-[1.5rem] border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-700 shadow-sm">
          <p>Новых: {session.summary.new_count}</p>
          <p>К повторению: {session.summary.due_count}</p>
        </div>
      </div>
      {session.loadedFromCache ? <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">Открыта последняя сохранённая очередь. Новые ответы будут синхронизированы позже.</p> : null}
      {!isOnline ? <p className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-800">Сеть недоступна. Можно продолжать только уже загруженную очередь на этом устройстве.</p> : null}
      {pendingReviewCount > 0 && isOnline ? <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">Есть ответы, которые ещё не успели синхронизироваться: {pendingReviewCount}.</p> : null}

      <article className="rounded-[2rem] border border-slate-200/80 bg-white/92 p-5 shadow-[0_24px_80px_rgba(148,163,184,0.18)] sm:p-6">
        <div className="mb-5 flex flex-wrap items-center gap-3 text-sm">
          <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 font-medium text-sky-900">{activeCard.template_type}</span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">{activeCard.deck_slug}</span>
        </div>

        <h3 className="text-2xl font-semibold tracking-tight text-slate-950">{activeCard.prompt}</h3>

        <div className="mt-6">
          <ReviewCardView
            card={activeCard}
            revealed={revealed}
            draftHeading={draftHeading}
            selectedBoatId={selectedBoatId}
            selectedOptionId={selectedOptionId}
            onRotateBoat={handleRotateBoat}
            onTapBoat={setSelectedBoatId}
            onSelectOption={setSelectedOptionId}
          />
        </div>

        {!revealed ? (
          <div className="mt-6">
            <button className="min-h-12 rounded-full bg-slate-950 px-5 py-3 font-semibold text-white transition hover:bg-slate-800" onClick={() => setRevealed(true)} type="button">
              Показать ответ
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="sticky bottom-3 z-10 -mx-2 rounded-[1.75rem] border border-slate-200 bg-white/96 p-2 shadow-2xl shadow-slate-300/30 backdrop-blur sm:mx-0 sm:p-3 xl:static xl:border-0 xl:bg-transparent xl:p-0 xl:shadow-none">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {REVIEW_RATINGS.map((rating) => (
                <button
                  key={rating}
                  className="min-h-12 rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:border-slate-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={submitting}
                  onClick={() => void handleRate(rating)}
                  type="button"
                >
                  <span className="block text-base font-semibold text-slate-950">{RATING_LABELS[rating]}</span>
                  <span className="mt-2 block text-sm leading-6 text-slate-600">
                    {session.previews ? formatNextReview(session.previews[rating].dueAt, session.currentStartedAt ?? new Date()) : "Без прогноза"}
                  </span>
                </button>
              ))}
            </div>
            </div>
            {submitting ? <p className="text-sm text-slate-600">Сохраняем ответ...</p> : null}
          </div>
        )}
      </article>
    </section>
  );
}
