/*
This file tracks browser online state and pending review sync status for the whole app.
Edit this file when app-wide offline banners, replay timing, or pending-review indicators change.
Copy this file as a starting point when you add another small browser-state provider.
*/

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./auth";
import { getPendingReviewChangeEventName, getPendingReviewCount } from "../shared/offlineStore";
import { syncPendingReviewEvents } from "../shared/offlineSync";

type OfflineContextValue = {
  isOnline: boolean;
  pendingReviewCount: number;
  syncing: boolean;
  refreshPendingReviewCount: () => Promise<void>;
};

const OfflineContext = createContext<OfflineContextValue | null>(null);

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const [pendingReviewCount, setPendingReviewCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const userKey = user?.username ?? null;

  useEffect(() => {
    const updateOnlineState = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateOnlineState);
    window.addEventListener("offline", updateOnlineState);
    return () => {
      window.removeEventListener("online", updateOnlineState);
      window.removeEventListener("offline", updateOnlineState);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function refreshCount() {
      if (!userKey) {
        if (!cancelled) {
          setPendingReviewCount(0);
        }
        return;
      }
      const count = await getPendingReviewCount(userKey);
      if (!cancelled) {
        setPendingReviewCount(count);
      }
    }

    void refreshCount();
    const eventName = getPendingReviewChangeEventName();
    const handler = () => {
      void refreshCount();
    };
    window.addEventListener(eventName, handler);
    return () => {
      cancelled = true;
      window.removeEventListener(eventName, handler);
    };
  }, [userKey]);

  useEffect(() => {
    let cancelled = false;

    async function runSync() {
      if (!userKey || !isOnline) {
        return;
      }
      setSyncing(true);
      try {
        const remaining = await syncPendingReviewEvents(userKey);
        if (!cancelled) {
          setPendingReviewCount(remaining);
        }
      } finally {
        if (!cancelled) {
          setSyncing(false);
        }
      }
    }

    void runSync();
    return () => {
      cancelled = true;
    };
  }, [isOnline, userKey]);

  const value = useMemo<OfflineContextValue>(
    () => ({
      isOnline,
      pendingReviewCount,
      syncing,
      async refreshPendingReviewCount() {
        if (!userKey) {
          setPendingReviewCount(0);
          return;
        }
        setPendingReviewCount(await getPendingReviewCount(userKey));
      },
    }),
    [isOnline, pendingReviewCount, syncing, userKey],
  );

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}

export function useOfflineStatus() {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error("useOfflineStatus must be used inside OfflineProvider");
  }
  return context;
}
