/*
This file wraps ts-fsrs and converts between library cards and app storage types.
Edit this file when FSRS scheduling rules or review preview formatting change.
Copy this file as a starting point when you add another pure scheduling helper.
*/

import { createEmptyCard, fsrs, Rating, State, type Card, type CardInput, type Grade, type RecordLogItem } from "ts-fsrs";
import type { FsrsState, ReviewRating } from "./types";

export type ScheduledReview = {
  fsrsState: FsrsState;
  phase: "new" | "learning" | "review" | "relearning";
  dueAt: string;
  lastReviewedAt: string | null;
};

export type ReviewPreview = ScheduledReview & {
  rating: ReviewRating;
};

function toIsoString(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function toCardStateName(state: number): ScheduledReview["phase"] {
  switch (state) {
    case State.New:
      return "new";
    case State.Learning:
      return "learning";
    case State.Review:
      return "review";
    case State.Relearning:
      return "relearning";
    default:
      return "new";
  }
}

function toGrade(rating: ReviewRating): Grade {
  switch (rating) {
    case 1:
      return Rating.Again;
    case 2:
      return Rating.Hard;
    case 3:
      return Rating.Good;
    case 4:
      return Rating.Easy;
  }
}

function toStoredFsrsState(card: Card): FsrsState {
  return {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: toIsoString(card.last_review),
  };
}

function toCardInput(state: FsrsState): CardInput {
  return {
    due: state.due,
    stability: state.stability,
    difficulty: state.difficulty,
    elapsed_days: state.elapsed_days,
    scheduled_days: state.scheduled_days,
    learning_steps: state.learning_steps,
    reps: state.reps,
    lapses: state.lapses,
    state: state.state,
    last_review: state.last_review,
  };
}

function toScheduledReview(record: RecordLogItem): ScheduledReview {
  return {
    fsrsState: toStoredFsrsState(record.card),
    phase: toCardStateName(record.card.state),
    dueAt: record.card.due.toISOString(),
    lastReviewedAt: toIsoString(record.card.last_review),
  };
}

export function createScheduler(desiredRetention: number) {
  return fsrs({
    request_retention: desiredRetention,
    enable_fuzz: false,
  });
}

export function createNewFsrsState(now: string | Date): FsrsState {
  const card = createEmptyCard(new Date(now));
  return toStoredFsrsState(card);
}

export function scheduleReview(
  fsrsStateOrNull: FsrsState | null,
  rating: ReviewRating,
  now: string | Date,
  desiredRetention: number,
): ScheduledReview {
  const scheduler = createScheduler(desiredRetention);
  const card = fsrsStateOrNull ? toCardInput(fsrsStateOrNull) : toCardInput(createNewFsrsState(now));
  return toScheduledReview(scheduler.next(card, new Date(now), toGrade(rating)));
}

export function previewNextReviews(
  fsrsStateOrNull: FsrsState | null,
  now: string | Date,
  desiredRetention: number,
): Record<ReviewRating, ReviewPreview> {
  const scheduler = createScheduler(desiredRetention);
  const card = fsrsStateOrNull ? toCardInput(fsrsStateOrNull) : toCardInput(createNewFsrsState(now));
  const preview = scheduler.repeat(card, new Date(now));

  return {
    1: { rating: 1, ...toScheduledReview(preview[Rating.Again]) },
    2: { rating: 2, ...toScheduledReview(preview[Rating.Hard]) },
    3: { rating: 3, ...toScheduledReview(preview[Rating.Good]) },
    4: { rating: 4, ...toScheduledReview(preview[Rating.Easy]) },
  };
}

export function formatNextReview(dueAt: string, now: string | Date): string {
  const diffMs = new Date(dueAt).getTime() - new Date(now).getTime();
  const clamped = Math.max(0, diffMs);
  const minutes = Math.round(clamped / 60000);

  if (minutes < 60) {
    return `через ${Math.max(1, minutes)} мин`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `через ${hours} ч`;
  }

  const days = Math.round(hours / 24);
  return `через ${days} дн`;
}
