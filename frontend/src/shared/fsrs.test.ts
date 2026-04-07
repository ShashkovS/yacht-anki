/*
This file tests the pure FSRS wrapper used by the review session.
Edit this file when FSRS storage mapping or preview behavior changes.
Copy a test pattern here when you add another pure scheduling helper.
*/

import { describe, expect, it } from "vitest";
import { createNewFsrsState, formatNextReview, previewNextReviews, scheduleReview } from "./fsrs";

const NOW = "2026-04-07T12:00:00.000Z";

describe("fsrs helpers", () => {
  it("creates a valid storage shape for a new card", () => {
    const state = createNewFsrsState(NOW);

    expect(state).toMatchObject({
      due: NOW,
      stability: expect.any(Number),
      difficulty: expect.any(Number),
      elapsed_days: expect.any(Number),
      scheduled_days: expect.any(Number),
      learning_steps: expect.any(Number),
      reps: expect.any(Number),
      lapses: expect.any(Number),
      state: expect.any(Number),
      last_review: null,
    });
  });

  it("schedules a new card forward in time for Good", () => {
    const result = scheduleReview(null, 3, NOW, 0.9);

    expect(new Date(result.dueAt).getTime()).toBeGreaterThan(new Date(NOW).getTime());
    expect(result.lastReviewedAt).toBe(NOW);
  });

  it("again keeps the card in a learning path", () => {
    const result = scheduleReview(null, 1, NOW, 0.9);
    expect(["learning", "relearning"]).toContain(result.phase);
  });

  it("returns deterministic results with the same inputs", () => {
    const first = scheduleReview(null, 3, NOW, 0.9);
    const second = scheduleReview(null, 3, NOW, 0.9);

    expect(second).toEqual(first);
  });

  it("changes the interval when desired retention changes", () => {
    const reviewedState = {
      due: NOW,
      stability: 5,
      difficulty: 5,
      elapsed_days: 5,
      scheduled_days: 5,
      learning_steps: 0,
      reps: 5,
      lapses: 0,
      state: 2,
      last_review: "2026-04-02T12:00:00.000Z",
    } as const;
    const lowerRetention = scheduleReview(reviewedState, 3, NOW, 0.8);
    const higherRetention = scheduleReview(reviewedState, 3, NOW, 0.95);

    expect(new Date(lowerRetention.dueAt).getTime()).toBeGreaterThan(new Date(higherRetention.dueAt).getTime());
  });

  it("returns four previews in monotonic interval order", () => {
    const preview = previewNextReviews(null, NOW, 0.9);
    const dueTimes = [preview[1], preview[2], preview[3], preview[4]].map((item) => new Date(item.dueAt).getTime());

    expect(preview[1].rating).toBe(1);
    expect(preview[4].rating).toBe(4);
    expect(dueTimes[0]).toBeLessThanOrEqual(dueTimes[1]);
    expect(dueTimes[1]).toBeLessThanOrEqual(dueTimes[2]);
    expect(dueTimes[2]).toBeLessThanOrEqual(dueTimes[3]);
  });

  it("formats short and long future times in Russian", () => {
    expect(formatNextReview("2026-04-07T12:10:00.000Z", NOW)).toBe("через 10 мин");
    expect(formatNextReview("2026-04-10T12:00:00.000Z", NOW)).toBe("через 3 дн");
  });
});
