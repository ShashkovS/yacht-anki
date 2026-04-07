/*
This file tests the plain review-session module on top of API mocks and offline helpers.
Edit this file when queue loading, offline replay, or session-state updates change.
Copy a test pattern here when you add another pure workflow module.
*/

import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./api";
import { loadReviewSession, submitCurrentReview } from "./reviewSession";
import type { FsrsState } from "./types";

vi.mock("./api", () => ({
  ApiError: class extends Error {
    status: number;
    code: string;

    constructor(status: number, code: string, message: string) {
      super(message);
      this.status = status;
      this.code = code;
    }
  },
  postJson: vi.fn(),
}));

vi.mock("./offlineStore", () => ({
  loadApiSnapshot: vi.fn(),
  loadCachedReviewSession: vi.fn(),
  queuePendingReviewEvent: vi.fn(),
  saveApiSnapshot: vi.fn(),
  saveCachedReviewSession: vi.fn(),
}));

vi.mock("./offlineSync", () => ({
  buildClientEventId: vi.fn(() => "event-1"),
  isNetworkError: vi.fn((error: unknown) => error instanceof ApiError && error.code === "network_error"),
  syncPendingReviewEvents: vi.fn().mockResolvedValue(0),
}));

import { postJson } from "./api";
import { loadCachedReviewSession, queuePendingReviewEvent, saveApiSnapshot, saveCachedReviewSession } from "./offlineStore";
import { syncPendingReviewEvents } from "./offlineSync";

const mockedPostJson = vi.mocked(postJson);
const mockedLoadCachedReviewSession = vi.mocked(loadCachedReviewSession);
const mockedQueuePendingReviewEvent = vi.mocked(queuePendingReviewEvent);
const mockedSaveApiSnapshot = vi.mocked(saveApiSnapshot);
const mockedSaveCachedReviewSession = vi.mocked(saveCachedReviewSession);
const mockedSyncPendingReviewEvents = vi.mocked(syncPendingReviewEvents);

const sharedFsrsState: FsrsState = {
  due: "2026-04-07T12:00:00.000Z",
  stability: 3,
  difficulty: 5,
  elapsed_days: 0,
  scheduled_days: 0,
  learning_steps: 0,
  reps: 0,
  lapses: 0,
  state: 0,
  last_review: null,
};

function makeSession() {
  return {
    deckSlug: null,
    settings: {
      desired_retention: 0.9,
      new_cards_per_day: 10,
      reviews_per_day: null,
    },
    items: [
      {
        id: 1,
        deck_slug: "terms",
        template_type: "term_definition" as const,
        prompt: "Q1",
        answer: "A1",
        explanation: "E1",
        diagram_spec: {},
        tags: [],
        sort_order: 1,
        created_at: "",
        updated_at: "",
        state: {
          phase: "review" as const,
          due_at: "2026-04-07T12:00:00.000Z",
          last_reviewed_at: "2026-04-01T12:00:00.000Z",
          fsrs_state: { ...sharedFsrsState, last_review: "2026-04-01T12:00:00.000Z", state: 2, reps: 1 },
        },
      },
      {
        id: 2,
        deck_slug: "terms",
        template_type: "term_definition" as const,
        prompt: "Q2",
        answer: "A2",
        explanation: "E2",
        diagram_spec: {},
        tags: [],
        sort_order: 2,
        created_at: "",
        updated_at: "",
        state: null,
      },
    ],
    summary: {
      due_count: 1,
      new_count: 1,
      deck_slug: null,
    },
    currentIndex: 0,
    currentStartedAt: "2026-04-07T12:00:00.000Z",
    previews: {
      1: { rating: 1 as const, dueAt: "2026-04-07T12:10:00.000Z", phase: "learning" as const, lastReviewedAt: null, fsrsState: {} as never },
      2: { rating: 2 as const, dueAt: "2026-04-07T13:00:00.000Z", phase: "learning" as const, lastReviewedAt: null, fsrsState: {} as never },
      3: { rating: 3 as const, dueAt: "2026-04-08T12:00:00.000Z", phase: "review" as const, lastReviewedAt: null, fsrsState: {} as never },
      4: { rating: 4 as const, dueAt: "2026-04-10T12:00:00.000Z", phase: "review" as const, lastReviewedAt: null, fsrsState: {} as never },
    },
    stats: {
      submittedCount: 0,
      totalElapsedMs: 0,
    },
    loadedFromCache: false,
  };
}

describe("reviewSession", () => {
  beforeEach(() => {
    mockedPostJson.mockReset();
    mockedLoadCachedReviewSession.mockReset();
    mockedQueuePendingReviewEvent.mockReset();
    mockedSaveApiSnapshot.mockReset();
    mockedSaveCachedReviewSession.mockReset();
    mockedSyncPendingReviewEvents.mockClear();
    vi.stubGlobal("navigator", { onLine: true });
  });

  it("loads settings and queue into a typed session", async () => {
    mockedPostJson
      .mockResolvedValueOnce({ desired_retention: 0.9, new_cards_per_day: 10, reviews_per_day: null })
      .mockResolvedValueOnce({
        cards: [makeSession().items[0]],
        summary: { due_count: 1, new_count: 0, deck_slug: "terms" },
      });

    const session = await loadReviewSession({ userKey: "user", deckSlug: "terms", now: "2026-04-07T12:00:00.000Z" });

    expect(mockedSyncPendingReviewEvents).toHaveBeenCalledWith("user");
    expect(mockedPostJson).toHaveBeenNthCalledWith(1, "/settings/get");
    expect(mockedPostJson).toHaveBeenNthCalledWith(2, "/review/queue", { deck_slug: "terms" });
    expect(mockedSaveApiSnapshot).toHaveBeenCalled();
    expect(mockedSaveCachedReviewSession).toHaveBeenCalled();
    expect(session.deckSlug).toBe("terms");
    expect(session.items).toHaveLength(1);
    expect(session.previews).not.toBeNull();
    expect(session.loadedFromCache).toBe(false);
  });

  it("returns an empty session when the queue is empty", async () => {
    mockedPostJson
      .mockResolvedValueOnce({ desired_retention: 0.9, new_cards_per_day: 10, reviews_per_day: null })
      .mockResolvedValueOnce({
        cards: [],
        summary: { due_count: 0, new_count: 0, deck_slug: null },
      });

    const session = await loadReviewSession({ userKey: "user", now: "2026-04-07T12:00:00.000Z" });

    expect(session.items).toEqual([]);
    expect(session.currentStartedAt).toBeNull();
    expect(session.previews).toBeNull();
  });

  it("falls back to a cached queue when the network is unavailable", async () => {
    mockedPostJson.mockRejectedValue(new ApiError(0, "network_error", "offline"));
    mockedLoadCachedReviewSession.mockResolvedValue(makeSession());

    const session = await loadReviewSession({ userKey: "user", deckSlug: "terms", now: "2026-04-07T12:00:00.000Z" });

    expect(session.loadedFromCache).toBe(true);
    expect(session.currentStartedAt).toBe("2026-04-07T12:00:00.000Z");
    expect(session.items[0]?.prompt).toBe("Q1");
  });

  it("submits the current review and advances to the next card", async () => {
    mockedPostJson
      .mockResolvedValueOnce({ desired_retention: 0.9, new_cards_per_day: 10, reviews_per_day: null })
      .mockResolvedValueOnce({
        cards: makeSession().items,
        summary: { due_count: 1, new_count: 1, deck_slug: "terms" },
      })
      .mockResolvedValueOnce({
        card_state: {
          card_id: 1,
          phase: "review",
          due_at: "2026-04-08T12:00:00.000Z",
          last_reviewed_at: "2026-04-07T12:05:00.000Z",
        },
      });

    const session = await loadReviewSession({ userKey: "user", deckSlug: "terms", now: "2026-04-07T12:00:00.000Z" });
    const nextSession = await submitCurrentReview(session, 3, "user", "2026-04-07T12:05:00.000Z");

    expect(mockedPostJson).toHaveBeenNthCalledWith(
      3,
      "/review/submit",
      expect.objectContaining({
        card_id: 1,
        rating: 3,
        phase: expect.any(String),
        due_at: expect.any(String),
        reviewed_at: "2026-04-07T12:05:00.000Z",
        client_event_id: "event-1",
        elapsed_ms: 300000,
      }),
    );
    expect(nextSession.currentIndex).toBe(1);
    expect(nextSession.stats.submittedCount).toBe(1);
    expect(nextSession.stats.totalElapsedMs).toBe(300000);
    expect(nextSession.previews).not.toBeNull();
  });

  it("queues pending review events when the network fails during submit", async () => {
    mockedPostJson
      .mockResolvedValueOnce({ desired_retention: 0.9, new_cards_per_day: 10, reviews_per_day: null })
      .mockResolvedValueOnce({
        cards: makeSession().items,
        summary: { due_count: 1, new_count: 1, deck_slug: "terms" },
      })
      .mockRejectedValueOnce(new ApiError(0, "network_error", "offline"));

    const session = await loadReviewSession({ userKey: "user", deckSlug: "terms", now: "2026-04-07T12:00:00.000Z" });
    const nextSession = await submitCurrentReview(session, 3, "user", "2026-04-07T12:05:00.000Z");

    expect(mockedQueuePendingReviewEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        userKey: "user",
        deckSlug: "terms",
        clientEventId: "event-1",
        cardId: 1,
      }),
    );
    expect(nextSession.currentIndex).toBe(1);
    expect(nextSession.loadedFromCache).toBe(true);
  });

  it("returns the same session when there is no current card", async () => {
    mockedPostJson
      .mockResolvedValueOnce({ desired_retention: 0.9, new_cards_per_day: 10, reviews_per_day: null })
      .mockResolvedValueOnce({
        cards: [],
        summary: { due_count: 0, new_count: 0, deck_slug: null },
      });

    const session = await loadReviewSession({ userKey: "user", now: "2026-04-07T12:00:00.000Z" });
    const sameSession = await submitCurrentReview(session, 3, "user", "2026-04-07T12:05:00.000Z");

    expect(sameSession).toBe(session);
  });

  it("keeps non-network api errors visible to callers", async () => {
    mockedPostJson.mockRejectedValueOnce(new ApiError(500, "server_error", "Boom"));

    await expect(loadReviewSession({ userKey: "user" })).rejects.toMatchObject({ message: "Boom" });
  });
});
