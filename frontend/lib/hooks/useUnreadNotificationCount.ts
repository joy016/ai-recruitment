"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getUnreadNotificationCount } from "@/lib/api/notifications";
import { NOTIFICATION_POLL_INTERVAL_MS } from "@/constant/notifications";
import { onNotificationsRefresh } from "@/lib/utils/notificationRefresh";

/**
 * Unread count for the header bell. Refreshes on mount, when the window
 * regains focus, on the shared "notifications:refresh" event (fired after
 * actions that can create notifications, or a future push), and on an
 * interval that pauses while the tab is hidden.
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

    let timer: ReturnType<typeof setInterval> | undefined;
    const stopPolling = () => {
      if (timer !== undefined) clearInterval(timer);
      timer = undefined;
    };
    const startPolling = () => {
      stopPolling();
      timer = setInterval(refresh, NOTIFICATION_POLL_INTERVAL_MS);
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void refresh();
        startPolling();
      } else {
        stopPolling();
      }
    };

    // Initial load (same as refresh(), as a chain so no setState runs in the effect body).
    const initialRequestId = ++requestIdRef.current;
    getUnreadNotificationCount()
      .then((next) => {
        if (initialRequestId === requestIdRef.current) setCount(next);
      })
      .catch(() => {});

    if (document.visibilityState === "visible") startPolling();
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", refresh);
    const unsubscribe = onNotificationsRefresh(refresh);

    return () => {
      unsubscribe();
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", refresh);
    };
  }, [enabled, refresh]);

  return { count, refresh, adjust, reset };
}
