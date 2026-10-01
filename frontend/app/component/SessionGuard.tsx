"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import { clearToken, getToken } from "@/lib/utils/token";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { clearUser } from "@/lib/store/features/userSlice";
import ConfirmationModal from "./ConfirmationModal";

const IDLE_TIMEOUT_MS = 5 * 60 * 1000;
const IDLE_COUNTDOWN_SECONDS = 60;
const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "wheel",
  "scroll",
  "touchstart",
] as const;

export const SESSION_EXPIRED_REASON = "session-expired";

type WarningType = "refresh" | "idle" | null;

// The token lives in a cookie, which has no change event. Every logout path
// also dispatches clearUser, and the resulting re-render re-reads the cookie.
const subscribeToToken = () => () => {};
const getServerToken = () => null;

const isRefreshShortcut = (event: KeyboardEvent) =>
  event.key === "F5" ||
  ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "r");

/**
 * Guards an authenticated session. Mount it only inside authenticated
 * layouts (e.g. /hr) so it never runs on the login page.
 * - Leaving the page (reload button, closing the tab, navigating off-site)
 *   is caught centrally by beforeunload, which can only show the browser's
 *   native confirmation; leaving ends the session. Keyboard refreshes
 *   (F5 / Ctrl+R / Ctrl+Shift+R / Cmd+R) are intercepted first so they get
 *   the custom warning modal instead.
 * - Listeners are attached only while the user is authenticated and are
 *   removed as soon as they log out.
 * - After IDLE_TIMEOUT_MS without activity, a "Session Expiring" modal counts
 *   down and signs the user out automatically if they don't respond.
 */
export default function SessionGuard() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((state) => state.user.currentUser);
  const token = useSyncExternalStore(
    subscribeToToken,
    getToken,
    getServerToken,
  );
  const isAuthenticated = Boolean(currentUser || token);
  const [warning, setWarning] = useState<WarningType>(null);
  const [secondsLeft, setSecondsLeft] = useState(IDLE_COUNTDOWN_SECONDS);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<WarningType>(null);
  const skipUnloadPromptRef = useRef(false);

  useEffect(() => {
    warningRef.current = warning;
  }, [warning]);

  const endSession = useCallback(() => {
    clearToken();
    dispatch(clearUser());
  }, [dispatch]);

  const logout = useCallback(
    (reason?: string) => {
      endSession();
      router.replace(reason ? `/login?reason=${reason}` : "/login");
    },
    [endSession, router],
  );

  const startIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    idleTimerRef.current = setTimeout(() => {
      setSecondsLeft(IDLE_COUNTDOWN_SECONDS);
      setWarning("idle");
    }, IDLE_TIMEOUT_MS);
  }, []);

  // A native reload sends its request (with the cookie) before the old page's
  // pagehide clears the token, so the server lets it through. By the time
  // this page mounts the token is gone — send the user to sign in again.
  useEffect(() => {
    if (!getToken()) {
      logout();
    }
  }, [logout]);

  // Idle detection: any activity resets the timer, except while a warning is
  // open — the user must explicitly choose "Stay Signed In".
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const handleActivity = () => {
      if (warningRef.current) {
        return;
      }
      startIdleTimer();
    };

    startIdleTimer();
    ACTIVITY_EVENTS.forEach((eventName) =>
      window.addEventListener(eventName, handleActivity, { passive: true }),
    );

    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
      ACTIVITY_EVENTS.forEach((eventName) =>
        window.removeEventListener(eventName, handleActivity),
      );
    };
  }, [isAuthenticated, startIdleTimer]);

  // Countdown while the idle warning is open; auto-logout when it hits zero.
  useEffect(() => {
    if (warning !== "idle") {
      return;
    }
    if (secondsLeft <= 0) {
      logout(SESSION_EXPIRED_REASON);
      return;
    }
    const tick = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(tick);
  }, [warning, secondsLeft, logout]);

  // Refresh / leave protection.
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      // While a modal is already open, let the key fall through to the
      // native prompt rather than stacking a second modal.
      if (!isRefreshShortcut(event) || warningRef.current) {
        return;
      }
      event.preventDefault();
      setWarning("refresh");
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Skip when the user already confirmed in our modal, or when the session
      // was ended elsewhere (e.g. the 401 handler redirecting to /login).
      if (skipUnloadPromptRef.current || !getToken()) {
        return;
      }
      event.preventDefault();
    };

    // Fires only once the user has confirmed leaving/reloading.
    const handlePageHide = () => {
      clearToken();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [isAuthenticated]);

  const handleConfirmRefresh = () => {
    endSession();
    skipUnloadPromptRef.current = true;
    window.location.reload();
  };

  const handleStaySignedIn = () => {
    setWarning(null);
    startIdleTimer();
  };

  if (warning === "idle") {
    return (
      <ConfirmationModal
        open
        title="Session Expiring"
        description={`Your session is about to expire due to inactivity. Would you like to remain signed in? You will be automatically signed out in ${secondsLeft} second${secondsLeft === 1 ? "" : "s"}.`}
        cancelLabel="Stay Signed In"
        confirmLabel="Log Out"
        confirmTone="danger"
        onConfirm={() => logout()}
        onClose={handleStaySignedIn}
      />
    );
  }

  return (
    <ConfirmationModal
      open={warning === "refresh"}
      title="Refresh Page"
      description="Refreshing this page will end your current session and you will be required to sign in again. Are you sure you want to continue?"
      cancelLabel="Cancel"
      confirmLabel="Continue"
      confirmTone="danger"
      onConfirm={handleConfirmRefresh}
      onClose={handleStaySignedIn}
    />
  );
}
