/*
This file tests the IndexedDB offline store for cached sessions and pending review events.
Edit this file when offline store keys, browser persistence, or pending-event behavior changes.
Copy a test pattern here when you add another small IndexedDB-backed helper.
*/

import { describe, expect, it } from "vitest";
import {
  deletePendingReviewEvents,
  getPendingReviewCount,
  listPendingReviewEvents,
  loadApiSnapshot,
  loadCachedReviewSession,
  queuePendingReviewEvent,
  saveApiSnapshot,
  saveCachedReviewSession,
} from "./offlineStore";
import type { ReviewSession } from "./reviewSession";

function makeSession(): ReviewSession {
  return {
    deckSlug: "terms",
    settings: {
      desired_retention: 0.9,
      new_cards_per_day: 10,
      reviews_per_day: null,
    },
    items: [],
    summary: {
      due_count: 0,
      new_count: 0,
      deck_slug: "terms",
    },
    currentIndex: 0,
    currentStartedAt: null,
    previews: null,
    stats: {
      submittedCount: 0,
      totalElapsedMs: 0,
    },
    loadedFromCache: false,
  };
}

describe("offlineStore", () => {
  it("saves and loads snapshots and cached review sessions", async () => {
    await saveApiSnapshot("snapshot:test", { ok: true, count: 2 });
    await saveCachedReviewSession("user-snapshot", "terms", makeSession());

    await expect(loadApiSnapshot<{ ok: boolean; count: number }>("snapshot:test")).resolves.toEqual({ ok: true, count: 2 });
    await expect(loadCachedReviewSession("user-snapshot", "terms")).resolves.toMatchObject({
      deckSlug: "terms",
      summary: { deck_slug: "terms" },
    });
  });

  it("queues, lists, counts, and deletes pending review events", async () => {
    const firstId = "pending-user:event-a";
    const secondId = "pending-user:event-b";
    await deletePendingReviewEvents([firstId, secondId]);

    await queuePendingReviewEvent({
      id: secondId,
      userKey: "pending-user",
      deckSlug: "terms",
      clientEventId: "event-b",
      cardId: 2,
      rating: 3,
      fsrsState: {
        due: "2026-04-08T10:00:00.000Z",
        stability: 3,
        difficulty: 2,
        elapsed_days: 0,
        scheduled_days: 1,
        learning_steps: 0,
        reps: 1,
        lapses: 0,
        state: 2,
        last_review: "2026-04-07T10:00:00.000Z",
      },
      phase: "review",
      dueAt: "2026-04-08T10:00:00.000Z",
      reviewedAt: "2026-04-07T10:00:00.000Z",
      elapsedMs: 500,
      createdAt: "2026-04-07T10:00:00.000Z",
    });
    await queuePendingReviewEvent({
      id: firstId,
      userKey: "pending-user",
      deckSlug: "terms",
      clientEventId: "event-a",
      cardId: 1,
      rating: 1,
      fsrsState: {
        due: "2026-04-07T10:30:00.000Z",
        stability: 1,
        difficulty: 5,
        elapsed_days: 0,
        scheduled_days: 0,
        learning_steps: 0,
        reps: 0,
        lapses: 0,
        state: 1,
        last_review: null,
      },
      phase: "learning",
      dueAt: "2026-04-07T10:30:00.000Z",
      reviewedAt: "2026-04-07T09:00:00.000Z",
      elapsedMs: 300,
      createdAt: "2026-04-07T09:00:00.000Z",
    });

    await expect(getPendingReviewCount("pending-user")).resolves.toBe(2);
    await expect(listPendingReviewEvents("pending-user")).resolves.toMatchObject([
      { id: firstId, clientEventId: "event-a" },
      { id: secondId, clientEventId: "event-b" },
    ]);

    await deletePendingReviewEvents([firstId, secondId]);
    await expect(getPendingReviewCount("pending-user")).resolves.toBe(0);
  });
});
