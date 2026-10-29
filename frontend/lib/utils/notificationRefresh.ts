/**
 * The one shared way to say "notifications may have changed". Listeners (the
 * bell's unread count, the open notification panel) refetch from the server;
 * a future SignalR push can call requestNotificationsRefresh() too.
 */
export const NOTIFICATIONS_REFRESH_EVENT = "notifications:refresh";

/** Triggers within this window collapse into one refresh. */
export const NOTIFICATIONS_REFRESH_COALESCE_MS = 300;

let pendingTimer: ReturnType<typeof setTimeout> | undefined;

export const requestNotificationsRefresh = () => {
  if (typeof window === "undefined" || pendingTimer !== undefined) return;
  pendingTimer = setTimeout(() => {
    pendingTimer = undefined;
    window.dispatchEvent(new Event(NOTIFICATIONS_REFRESH_EVENT));
  }, NOTIFICATIONS_REFRESH_COALESCE_MS);
};

export const onNotificationsRefresh = (handler: () => void) => {
  window.addEventListener(NOTIFICATIONS_REFRESH_EVENT, handler);
  return () => window.removeEventListener(NOTIFICATIONS_REFRESH_EVENT, handler);
};

/**
 * Wraps an API call whose success can create a notification. Refreshes only
 * after it resolves; a rejected call propagates without refreshing.
 */
export const withNotificationRefresh = async <T>(
  request: Promise<T>,
): Promise<T> => {
  const result = await request;
  requestNotificationsRefresh();
  return result;
};
