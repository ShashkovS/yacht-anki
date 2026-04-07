/*
This file tests the plain review-session module on top of API mocks and FSRS helpers.
Edit this file when queue loading, submit flow, or session-state updates change.
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

import { postJson } from "./api";

const mockedPostJson = vi.mocked(postJson);

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

describe("reviewSession", () => {
  beforeEach(() => {
    mockedPostJson.mockReset();
  });

  it("loads settings and queue into a typed session", async () => {
    mockedPostJson
      .mockResolvedValueOnce({ desired_retention: 0.9, new_cards_per_day: 10, reviews_per_day: null })
      .mockResolvedValueOnce({
        cards: [
          {
            id: 1,
            deck_slug: "terms",
            template_type: "term_definition",
            prompt: "Q1",
            answer: "A1",
            explanation: "E1",
            diagram_spec: {},
            tags: [],
            sort_order: 1,
            created_at: "",
            updated_at: "",
            state: {
              phase: "review",
              due_at: "2026-04-07T12:00:00.000Z",
              last_reviewed_at: "2026-04-01T12:00:00.000Z",
              fsrs_state: sharedFsrsState,
            },
          },
        ],
        summary: { due_count: 1, new_count: 0, deck_slug: "terms" },
      });

    const session = await loadReviewSession({ deckSlug: "terms", now: "2026-04-07T12:00:00.000Z" });

    expect(mockedPostJson).toHaveBeenNthCalledWith(1, "/settings/get");
    expect(mockedPostJson).toHaveBeenNthCalledWith(2, "/review/queue", { deck_slug: "terms" });
    expect(session.deckSlug).toBe("terms");
    expect(session.items).toHaveLength(1);
    expect(session.previews).not.toBeNull();
  });

  it("returns an empty session when the queue is empty", async () => {
    mockedPostJson
      .mockResolvedValueOnce({ desired_retention: 0.9, new_cards_per_day: 10, reviews_per_day: null })
      .mockResolvedValueOnce({
        cards: [],
        summary: { due_count: 0, new_count: 0, deck_slug: null },
      });

    const session = await loadReviewSession({ now: "2026-04-07T12:00:00.000Z" });

    expect(session.items).toEqual([]);
    expect(session.currentStartedAt).toBeNull();
    expect(session.previews).toBeNull();
  });

  it("submits the current review and advances to the next card", async () => {
    mockedPostJson
      .mockResolvedValueOnce({ desired_retention: 0.9, new_cards_per_day: 10, reviews_per_day: null })
      .mockResolvedValueOnce({
        cards: [
          {
            id: 1,
            deck_slug: "terms",
            template_type: "term_definition",
            prompt: "Q1",
            answer: "A1",
            explanation: "E1",
            diagram_spec: {},
            tags: [],
            sort_order: 1,
            created_at: "",
            updated_at: "",
            state: {
              phase: "review",
              due_at: "2026-04-07T12:00:00.000Z",
              last_reviewed_at: "2026-04-01T12:00:00.000Z",
              fsrs_state: { ...sharedFsrsState, last_review: "2026-04-01T12:00:00.000Z", state: 2, reps: 1 },
            },
          },
          {
            id: 2,
            deck_slug: "terms",
            template_type: "term_definition",
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

    const session = await loadReviewSession({ deckSlug: "terms", now: "2026-04-07T12:00:00.000Z" });
    const nextSession = await submitCurrentReview(session, 3, "2026-04-07T12:05:00.000Z");

    expect(mockedPostJson).toHaveBeenNthCalledWith(
      3,
      "/review/submit",
      expect.objectContaining({
        card_id: 1,
        rating: 3,
        phase: expect.any(String),
        due_at: expect.any(String),
        elapsed_ms: 300000,
      }),
    );
    expect(nextSession.currentIndex).toBe(1);
    expect(nextSession.stats.submittedCount).toBe(1);
    expect(nextSession.stats.totalElapsedMs).toBe(300000);
    expect(nextSession.previews).not.toBeNull();
  });

  it("returns the same session when there is no current card", async () => {
    mockedPostJson
      .mockResolvedValueOnce({ desired_retention: 0.9, new_cards_per_day: 10, reviews_per_day: null })
      .mockResolvedValueOnce({
        cards: [],
        summary: { due_count: 0, new_count: 0, deck_slug: null },
      });

    const session = await loadReviewSession({ now: "2026-04-07T12:00:00.000Z" });
    const sameSession = await submitCurrentReview(session, 3, "2026-04-07T12:05:00.000Z");

    expect(sameSession).toBe(session);
  });

  it("keeps api errors visible to callers", async () => {
    mockedPostJson.mockRejectedValueOnce(new ApiError(500, "server_error", "Boom"));

    await expect(loadReviewSession()).rejects.toMatchObject({ message: "Boom" });
  });
});
