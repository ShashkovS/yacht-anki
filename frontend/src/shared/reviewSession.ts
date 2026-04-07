/*
This file manages the plain review-session flow on top of the backend API and FSRS helpers.
Edit this file when queue loading, submit flow, or session-state rules change.
Copy this file as a starting point when you add another pure frontend workflow module.
*/

import { postJson } from "./api";
import { previewNextReviews, scheduleReview, type ReviewPreview } from "./fsrs";
import { loadApiSnapshot, loadCachedReviewSession, queuePendingReviewEvent, saveApiSnapshot, saveCachedReviewSession } from "./offlineStore";
import { buildClientEventId, isNetworkError, syncPendingReviewEvents } from "./offlineSync";
import type { CardPhase, ReviewQueueItem, ReviewQueueSummary, ReviewRating, UserSettings } from "./types";

export type ReviewSessionStats = {
  submittedCount: number;
  totalElapsedMs: number;
};

export type ReviewSession = {
  deckSlug: string | null;
  settings: UserSettings;
  items: ReviewQueueItem[];
  summary: ReviewQueueSummary;
  currentIndex: number;
  currentStartedAt: string | null;
  previews: Record<ReviewRating, ReviewPreview> | null;
  stats: ReviewSessionStats;
  loadedFromCache: boolean;
};

type LoadReviewSessionOptions = {
  userKey: string;
  deckSlug?: string;
  now?: string | Date;
};

type ReviewQueueResponse = {
  cards: ReviewQueueItem[];
  summary: ReviewQueueSummary;
};

type ReviewSubmitResponse = {
  card_state: {
    card_id: number;
    phase: CardPhase;
    due_at: string;
    last_reviewed_at: string | null;
  };
};

const SETTINGS_SNAPSHOT_PREFIX = "settings";

function toIsoNow(now: string | Date | undefined): string {
  return new Date(now ?? new Date()).toISOString();
}

function getCurrentItem(session: ReviewSession): ReviewQueueItem | null {
  return session.items[session.currentIndex] ?? null;
}

function buildPreviews(item: ReviewQueueItem | null, desiredRetention: number, now: string): Record<ReviewRating, ReviewPreview> | null {
  if (!item) {
    return null;
  }
  return previewNextReviews(item.state?.fsrs_state ?? null, now, desiredRetention);
}

function getSettingsSnapshotKey(userKey: string): string {
  return `${SETTINGS_SNAPSHOT_PREFIX}:${userKey}`;
}

export async function loadReviewSession(options: LoadReviewSessionOptions): Promise<ReviewSession> {
  const payload = options.deckSlug ? { deck_slug: options.deckSlug } : {};
  const now = toIsoNow(options.now);
  if (typeof navigator !== "undefined" && navigator.onLine) {
    await syncPendingReviewEvents(options.userKey);
  }

  try {
    const [settings, queue] = await Promise.all([
      postJson<UserSettings>("/settings/get"),
      postJson<ReviewQueueResponse>("/review/queue", payload),
    ]);
    await saveApiSnapshot(getSettingsSnapshotKey(options.userKey), settings);
    const session: ReviewSession = {
      deckSlug: options.deckSlug ?? null,
      settings,
      items: queue.cards,
      summary: queue.summary,
      currentIndex: 0,
      currentStartedAt: queue.cards.length > 0 ? now : null,
      previews: buildPreviews(queue.cards[0] ?? null, settings.desired_retention, now),
      stats: {
        submittedCount: 0,
        totalElapsedMs: 0,
      },
      loadedFromCache: false,
    };
    await saveCachedReviewSession(options.userKey, options.deckSlug ?? null, session);
    return session;
  } catch (error) {
    if (!isNetworkError(error)) {
      throw error;
    }

    const cachedSession = await loadCachedReviewSession(options.userKey, options.deckSlug ?? null);
    if (cachedSession) {
      const currentItem = cachedSession.items[cachedSession.currentIndex] ?? null;
      return {
        ...cachedSession,
        currentStartedAt: currentItem ? now : null,
        previews: buildPreviews(currentItem, cachedSession.settings.desired_retention, now),
        loadedFromCache: true,
      };
    }

    const cachedSettings = await loadApiSnapshot<UserSettings>(getSettingsSnapshotKey(options.userKey));
    if (cachedSettings) {
      throw new Error("Оффлайн-очередь ещё не подготовлена. Сначала откройте повторение онлайн на этом устройстве.");
    }
    throw error;
  }
}

export async function submitCurrentReview(
  session: ReviewSession,
  rating: ReviewRating,
  userKey: string,
  now: string | Date = new Date(),
): Promise<ReviewSession> {
  const current = getCurrentItem(session);
  if (!current) {
    return session;
  }

  const nowIso = toIsoNow(now);
  const startedAt = session.currentStartedAt ? new Date(session.currentStartedAt).getTime() : new Date(nowIso).getTime();
  const elapsedMs = Math.max(0, new Date(nowIso).getTime() - startedAt);
  const scheduled = scheduleReview(current.state?.fsrs_state ?? null, rating, nowIso, session.settings.desired_retention);
  const clientEventId = buildClientEventId();

  const submitPayload = {
    card_id: current.id,
    rating,
    fsrs_state: scheduled.fsrsState,
    phase: scheduled.phase,
    due_at: scheduled.dueAt,
    reviewed_at: nowIso,
    client_event_id: clientEventId,
    elapsed_ms: elapsedMs,
  };

  const updatedItems = session.items.map((item, index) =>
    index === session.currentIndex
      ? {
          ...item,
          state: {
            phase: scheduled.phase,
            due_at: scheduled.dueAt,
            last_reviewed_at: scheduled.lastReviewedAt,
            fsrs_state: scheduled.fsrsState,
          },
        }
      : item,
  );

  const nextIndex = session.currentIndex + 1;
  const nextItem = updatedItems[nextIndex] ?? null;
  const nextSession: ReviewSession = {
    ...session,
    items: updatedItems,
    currentIndex: nextIndex,
    currentStartedAt: nextItem ? nowIso : null,
    previews: buildPreviews(nextItem, session.settings.desired_retention, nowIso),
    stats: {
      submittedCount: session.stats.submittedCount + 1,
      totalElapsedMs: session.stats.totalElapsedMs + elapsedMs,
    },
  };

  try {
    await postJson<ReviewSubmitResponse>("/review/submit", submitPayload);
  } catch (error) {
    if (!isNetworkError(error)) {
      throw error;
    }
    await queuePendingReviewEvent({
      id: `${userKey}:${clientEventId}`,
      userKey,
      deckSlug: session.deckSlug,
      clientEventId,
      cardId: current.id,
      rating,
      fsrsState: scheduled.fsrsState,
      phase: scheduled.phase,
      dueAt: scheduled.dueAt,
      reviewedAt: nowIso,
      elapsedMs,
      createdAt: new Date().toISOString(),
    });
    nextSession.loadedFromCache = true;
  }

  await saveCachedReviewSession(userKey, session.deckSlug, nextSession);

  return nextSession;
}
