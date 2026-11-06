"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getUnreadNotificationCount } from "@/lib/api/notifications";
import { onNotificationsRefresh } from "@/lib/utils/notificationRefresh";

/**
 * Unread count for the header bell. Refreshes on mount, when the window
 * regains focus, and on the shared "notifications:refresh" event - fired
 * after actions that can create notifications, by the dashboard-wide
 * useLiveRefresh heartbeat (see lib/hooks/useLiveRefresh.ts), or by a future
 * SignalR push. The interval itself lives in useLiveRefresh, not here.
 */
export function useUnreadNotificationCount(enabled: boolean) {
  const [count, setCount] = useState(0);
  // Drops responses from older requests that resolve after newer ones.
  const requestIdRef = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    try {
      const next = await getUnreadNotificationCount();
      if (requestId === requestIdRef.current) setCount(next);
    } catch {
      // Background refresh: keep the last known count. 401s are handled by
      // the api client (logout + redirect).
    }
  }, []);

  /** Optimistic local change, e.g. -1 after marking one item read. */
  const adjust = useCallback((delta: number) => {
    requestIdRef.current++; // an in-flight poll would overwrite this
    setCount((current) => Math.max(current + delta, 0));
  }, []);

  const reset = useCallback(() => {
    requestIdRef.current++;
    setCount(0);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Initial load (same as refresh(), as a chain so no setState runs in the effect body).
    const initialRequestId = ++requestIdRef.current;
    getUnreadNotificationCount()
      .then((next) => {
        if (initialRequestId === requestIdRef.current) setCount(next);
      })
      .catch(() => {});

    // Also refetch immediately on visibility regain - useLiveRefresh's own
    // visibility handling only guarantees the next heartbeat, not an
    // immediate one, so this keeps the bell snappy on tab-switch too.
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", refresh);
    const unsubscribe = onNotificationsRefresh(refresh);

    return () => {
      unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", refresh);
    };
  }, [enabled, refresh]);

  return { count, refresh, adjust, reset };
}
