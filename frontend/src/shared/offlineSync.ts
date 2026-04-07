/*
This file replays pending review events and tracks browser network-related offline helpers.
Edit this file when offline replay rules, dedupe payloads, or browser sync behavior changes.
Copy this file as a starting point when you add another small offline queue processor.
*/

import { ApiError, postJson } from "./api";
import { deletePendingReviewEvents, type PendingReviewEvent, getPendingReviewCount, listPendingReviewEvents } from "./offlineStore";

type ReviewSubmitResponse = {
  card_state: {
    card_id: number;
    phase: string;
    due_at: string;
    last_reviewed_at: string | null;
  };
};

export function isNetworkError(error: unknown): boolean {
  return error instanceof ApiError && error.code === "network_error";
}

export function buildClientEventId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `review-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function replayPendingReviewEvent(event: PendingReviewEvent): Promise<void> {
  await postJson<ReviewSubmitResponse>("/review/submit", {
    card_id: event.cardId,
    rating: event.rating,
    fsrs_state: event.fsrsState,
    phase: event.phase,
    due_at: event.dueAt,
    reviewed_at: event.reviewedAt,
    client_event_id: event.clientEventId,
    elapsed_ms: event.elapsedMs,
  });
}

export async function syncPendingReviewEvents(userKey: string | null): Promise<number> {
  if (!userKey || typeof navigator === "undefined" || !navigator.onLine) {
    return 0;
  }

  const events = await listPendingReviewEvents(userKey);
  const syncedIds: string[] = [];
  for (const event of events) {
    try {
      await replayPendingReviewEvent(event);
      syncedIds.push(event.id);
    } catch (error) {
      if (isNetworkError(error)) {
        break;
      }
      if (error instanceof ApiError && error.status === 401) {
        break;
      }
      throw error;
    }
  }

  await deletePendingReviewEvents(syncedIds);
  return getPendingReviewCount(userKey);
}
