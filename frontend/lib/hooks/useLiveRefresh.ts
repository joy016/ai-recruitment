"use client";

import { useEffect } from "react";
import { LIVE_REFRESH_INTERVAL_MS } from "@/constant/liveRefresh";
import { requestCandidatesRefresh } from "@/lib/utils/candidatesRefresh";
import { requestNotificationsRefresh } from "@/lib/utils/notificationRefresh";

/**
 * The dashboard's single polling heartbeat. Mounted once at the HR layout
 * level so every page (not just Candidates) stays current. On each tick -
 * and immediately when the tab regains visibility - it pings the candidates
 * and notifications refresh buses; listeners (the Candidates table, the
 * Needs Manual Review count, the bell, the notification panel) each decide
 * how to refetch and never show a loading spinner for it.
 *
 * Pauses while the tab is hidden so a backgrounded dashboard tab doesn't poll
 * forever. `enabled` is the external on/off switch: once SignalR is
 * connected (a later phase), this is turned off and the realtime push takes
 * over, with polling only as a fallback while disconnected/reconnecting.
 */
export function useLiveRefresh(enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const tick = () => {
      requestCandidatesRefresh();
      requestNotificationsRefresh();
    };

    let timer: ReturnType<typeof setInterval> | undefined;
    const stopPolling = () => {
      if (timer !== undefined) clearInterval(timer);
      timer = undefined;
    };
    const startPolling = () => {
      stopPolling();
      timer = setInterval(tick, LIVE_REFRESH_INTERVAL_MS);
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        tick();
        startPolling();
      } else {
        stopPolling();
      }
    };

    if (document.visibilityState === "visible") startPolling();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [enabled]);
}
