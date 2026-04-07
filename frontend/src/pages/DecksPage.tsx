/*
This file shows the authenticated deck list with progress and review entry points.
Edit this file when deck list loading, progress cards, or deck navigation changes.
Copy this file as a starting point when you add another authenticated catalog page.
*/

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { postJson } from "../shared/api";
import type { DeckListItem } from "../shared/types";

type DecksListResponse = {
  decks: DeckListItem[];
};

export function DecksPage() {
  const [decks, setDecks] = useState<DeckListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    postJson<DecksListResponse>("/decks/list")
      .then((data) => {
        if (!cancelled) {
          setDecks(data.decks);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить колоды.");
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
  }, []);

  if (loading) {
    return <p className="text-slate-600">Загружаем колоды...</p>;
  }

  if (error) {
    return <div className="rounded-[1.75rem] border border-rose-200 bg-rose-50 px-5 py-5 text-rose-900">{error}</div>;
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight text-slate-950">Колоды</h2>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">Здесь собраны все учебные наборы. Можно открыть колоду целиком или сразу перейти к повторению по ней.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {decks.map((deck) => (
          <article key={deck.slug} className="rounded-[2rem] border border-slate-200/80 bg-white/92 p-6 shadow-lg shadow-slate-200/60">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-950">{deck.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-700">{deck.description}</p>
              </div>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700">{deck.card_count} карт.</span>
            </div>
            {deck.progress ? (
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-700">
                <div className="rounded-2xl bg-slate-50 px-4 py-3">Новых: {deck.progress.new_cards}</div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">На повторении: {deck.progress.review_cards}</div>
              </div>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-3">
              <Link className="rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800" to={`/decks/${deck.slug}`}>
                Открыть колоду
              </Link>
              <Link className="rounded-full border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50" to={`/review?deck=${deck.slug}`}>
                Учить эту колоду
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
