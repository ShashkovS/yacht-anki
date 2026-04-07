/*
This file stores cached API data and pending review events in IndexedDB for offline use.
Edit this file when offline cache keys, IndexedDB stores, or browser persistence rules change.
Copy this file as a starting point when you add another small browser-side persistence helper.
*/

import type { ReviewSession } from "./reviewSession";
import type { CardPhase, FsrsState, ReviewRating } from "./types";

const DATABASE_NAME = "yacht-anki-offline";
const DATABASE_VERSION = 1;
const PENDING_REVIEW_EVENTS_STORE = "pending_review_events";
const CACHED_REVIEW_QUEUE_STORE = "cached_review_queue";
const API_SNAPSHOTS_STORE = "api_snapshots";
const PENDING_REVIEW_EVENT_CHANGE = "offline-pending-reviews-changed";

export type PendingReviewEvent = {
  id: string;
  userKey: string;
  deckSlug: string | null;
  clientEventId: string;
  cardId: number;
  rating: ReviewRating;
  fsrsState: FsrsState;
  phase: CardPhase;
  dueAt: string;
  reviewedAt: string;
  elapsedMs: number;
  createdAt: string;
};

type CachedReviewSessionRecord = {
  id: string;
  userKey: string;
  deckSlug: string | null;
  session: ReviewSession;
  updatedAt: string;
};

type ApiSnapshotRecord = {
  id: string;
  value: unknown;
  updatedAt: string;
};

function dispatchPendingReviewsChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(PENDING_REVIEW_EVENT_CHANGE));
  }
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onerror = () => reject(request.error ?? new Error("Не удалось открыть offline cache."));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PENDING_REVIEW_EVENTS_STORE)) {
        const store = db.createObjectStore(PENDING_REVIEW_EVENTS_STORE, { keyPath: "id" });
        store.createIndex("by_user_key", "userKey", { unique: false });
      }
      if (!db.objectStoreNames.contains(CACHED_REVIEW_QUEUE_STORE)) {
        db.createObjectStore(CACHED_REVIEW_QUEUE_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(API_SNAPSHOTS_STORE)) {
        db.createObjectStore(API_SNAPSHOTS_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => Promise<T> | T,
): Promise<T> {
  return openDatabase().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        let settled = false;

        transaction.onerror = () => {
          if (!settled) {
            settled = true;
            reject(transaction.error ?? new Error("IndexedDB transaction failed."));
          }
        };
        transaction.oncomplete = () => {
          db.close();
        };
        transaction.onabort = () => {
          if (!settled) {
            settled = true;
            reject(transaction.error ?? new Error("IndexedDB transaction aborted."));
          }
          db.close();
        };

        Promise.resolve(run(store))
          .then((value) => {
            if (!settled) {
              settled = true;
              resolve(value);
            }
          })
          .catch((error) => {
            if (!settled) {
              settled = true;
              reject(error);
            }
          });
      }),
  );
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
  });
}

function getReviewSessionKey(userKey: string, deckSlug: string | null): string {
  return `${userKey}::${deckSlug ?? "__all__"}`;
}

export function getPendingReviewChangeEventName(): string {
  return PENDING_REVIEW_EVENT_CHANGE;
}

export async function saveApiSnapshot<T>(id: string, value: T): Promise<void> {
  await withStore(API_SNAPSHOTS_STORE, "readwrite", (store) =>
    requestToPromise(
      store.put({
        id,
        value,
        updatedAt: new Date().toISOString(),
      } satisfies ApiSnapshotRecord),
    ),
  );
}

export async function loadApiSnapshot<T>(id: string): Promise<T | null> {
  const record = await withStore(API_SNAPSHOTS_STORE, "readonly", (store) => requestToPromise(store.get(id)));
  if (!record) {
    return null;
  }
  return (record as ApiSnapshotRecord).value as T;
}

export async function saveCachedReviewSession(userKey: string, deckSlug: string | null, session: ReviewSession): Promise<void> {
  await withStore(CACHED_REVIEW_QUEUE_STORE, "readwrite", (store) =>
    requestToPromise(
      store.put({
        id: getReviewSessionKey(userKey, deckSlug),
        userKey,
        deckSlug,
        session,
        updatedAt: new Date().toISOString(),
      } satisfies CachedReviewSessionRecord),
    ),
  );
}

export async function loadCachedReviewSession(userKey: string, deckSlug: string | null): Promise<ReviewSession | null> {
  const record = await withStore(CACHED_REVIEW_QUEUE_STORE, "readonly", (store) => requestToPromise(store.get(getReviewSessionKey(userKey, deckSlug))));
  if (!record) {
    return null;
  }
  return (record as CachedReviewSessionRecord).session;
}

export async function queuePendingReviewEvent(event: PendingReviewEvent): Promise<void> {
  await withStore(PENDING_REVIEW_EVENTS_STORE, "readwrite", (store) => requestToPromise(store.put(event)));
  dispatchPendingReviewsChanged();
}

export async function listPendingReviewEvents(userKey: string): Promise<PendingReviewEvent[]> {
  const records = await withStore(PENDING_REVIEW_EVENTS_STORE, "readonly", async (store) => {
    const index = store.index("by_user_key");
    const all = (await requestToPromise(index.getAll(userKey))) as PendingReviewEvent[];
    return all;
  });
  return records.sort((left, right) => left.reviewedAt.localeCompare(right.reviewedAt) || left.createdAt.localeCompare(right.createdAt));
}

export async function deletePendingReviewEvents(ids: string[]): Promise<void> {
  if (ids.length === 0) {
    return;
  }
  await withStore(PENDING_REVIEW_EVENTS_STORE, "readwrite", async (store) => {
    for (const id of ids) {
      await requestToPromise(store.delete(id));
    }
  });
  dispatchPendingReviewsChanged();
}

export async function getPendingReviewCount(userKey: string): Promise<number> {
  const events = await listPendingReviewEvents(userKey);
  return events.length;
}
