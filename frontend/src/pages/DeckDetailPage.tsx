/*
This file shows one deck, its cards, and a CTA to start deck-scoped review.
Edit this file when deck detail loading, card status display, or CTA behavior changes.
Copy this file as a starting point when you add another detail page for catalog content.
*/

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getCardStatusLabel } from "../features/review/reviewCardHelpers";
import { postJson } from "../shared/api";
import { loadApiSnapshot, saveApiSnapshot } from "../shared/offlineStore";
import type { CardsListResponse, DeckDetail } from "../shared/types";

type DeckGetResponse = {
  deck: DeckDetail;
};

export function DeckDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [deck, setDeck] = useState<DeckDetail | null>(null);
  const [cards, setCards] = useState<CardsListResponse["cards"]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadedFromCache, setLoadedFromCache] = useState(false);

  useEffect(() => {
    if (!slug) {
      setError("Колода не найдена.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoadedFromCache(false);
    const snapshotKey = `deck:${slug}`;
    (async () => {
      try {
        const [deckResponse, cardsResponse] = await Promise.all([
          postJson<DeckGetResponse>("/decks/get", { slug }),
          postJson<CardsListResponse>("/cards/list", { deck_slug: slug }),
        ]);
        await saveApiSnapshot(snapshotKey, { deck: deckResponse.deck, cards: cardsResponse.cards });
        if (!cancelled) {
          setDeck(deckResponse.deck);
          setCards(cardsResponse.cards);
        }
      } catch (loadError) {
        const cached = await loadApiSnapshot<{ deck: DeckDetail; cards: CardsListResponse["cards"] }>(snapshotKey);
        if (cached) {
          if (!cancelled) {
            setDeck(cached.deck);
            setCards(cached.cards);
            setLoadedFromCache(true);
          }
          return;
        }
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить колоду.");
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
  }, [slug]);

  if (loading) {
    return <p className="text-slate-600">Загружаем колоду...</p>;
  }

  if (error || !deck) {
    return <div className="rounded-[1.75rem] border border-rose-200 bg-rose-50 px-5 py-5 text-rose-900">{error || "Колода не найдена."}</div>;
  }

  return (
    <section className="space-y-6">
      {loadedFromCache ? <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">Показана последняя сохранённая версия колоды. Для обновления нужна сеть.</p> : null}
      <article className="rounded-[2rem] border border-sky-950/10 bg-[linear-gradient(135deg,rgba(12,74,110,0.96),rgba(15,118,110,0.92))] p-8 text-white shadow-[0_24px_80px_rgba(12,74,110,0.24)]">
        <p className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm">{deck.card_count} карт.</p>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight">{deck.title}</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-sky-50/90">{deck.description}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="rounded-full bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-slate-100" to={`/review?deck=${deck.slug}`}>
            Учить эту колоду
          </Link>
          <Link className="rounded-full border border-white/25 px-5 py-3 font-semibold text-white transition hover:bg-white/10" to="/decks">
            Назад к колодам
          </Link>
        </div>
      </article>

      <div className="space-y-3">
        {cards.map((card) => (
          <article key={card.id} className="rounded-[1.5rem] border border-slate-200/80 bg-white/92 p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">{card.prompt}</h3>
                <p className="mt-2 text-sm text-slate-600">{card.template_type}</p>
              </div>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700">{getCardStatusLabel(card.state?.phase)}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
