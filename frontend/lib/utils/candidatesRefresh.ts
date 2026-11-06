/**
 * The one shared way to say "the candidates list may have changed" (a new
 * applicant, a status/schedule edit, an n8n-driven status change). Listeners
 * (the Candidates table, the Needs Manual Review count) refetch from the
 * server; a future SignalR push can call requestCandidatesRefresh() too.
 */
export const CANDIDATES_REFRESH_EVENT = "candidates:refresh";

/** Triggers within this window collapse into one refresh. */
export const CANDIDATES_REFRESH_COALESCE_MS = 300;

let pendingTimer: ReturnType<typeof setTimeout> | undefined;

export const requestCandidatesRefresh = () => {
  if (typeof window === "undefined" || pendingTimer !== undefined) return;
  pendingTimer = setTimeout(() => {
    pendingTimer = undefined;
    window.dispatchEvent(new Event(CANDIDATES_REFRESH_EVENT));
  }, CANDIDATES_REFRESH_COALESCE_MS);
};

export const onCandidatesRefresh = (handler: () => void) => {
  window.addEventListener(CANDIDATES_REFRESH_EVENT, handler);
  return () => window.removeEventListener(CANDIDATES_REFRESH_EVENT, handler);
};

/**
 * Wraps an API call whose success can change the candidates list. Refreshes
 * only after it resolves; a rejected call propagates without refreshing.
 */
export const withCandidatesRefresh = async <T>(request: Promise<T>): Promise<T> => {
  const result = await request;
  requestCandidatesRefresh();
  return result;
};
