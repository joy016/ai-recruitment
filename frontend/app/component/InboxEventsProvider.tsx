"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Button, Snackbar } from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import { INBOX_EVENTS_URL, getThread, retrySend, toInboxError } from "@/lib/api/inbox";
import { inboxKeys, invalidateInbox } from "@/lib/hooks/useInbox";
import { SseHttpError, streamSse, type SseMessage } from "@/lib/utils/sse";
import { getToken } from "@/lib/utils/token";

type ToastAction = { label: string; onClick: () => void };
type Toast = { id: number; message: string; action?: ToastAction };

type InboxToastContextValue = {
  notify: (message: string, action?: ToastAction) => void;
};

const InboxToastContext = createContext<InboxToastContextValue>({ notify: () => {} });

/** Shows a snackbar from anywhere in the HR shell (one at a time). */
export const useInboxToast = () => useContext(InboxToastContext);

const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;
/** Failed attempts in a row before falling back to polling. */
const POLL_AFTER_FAILURES = 3;
const POLL_INTERVAL_MS = 60_000;

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve();
    });
  });

const parse = <T,>(data: string): T | null => {
  try {
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
};

/**
 * The app shell's single Inbox event stream (GET /api/inbox/events) plus the
 * shared snackbar. Opens when `enabled` (signed in with inbox.view) and
 * closes on logout or unmount. Reconnects with backoff, resyncs after a
 * reconnect, and polls counts every 60s while the stream is down.
 */
export default function InboxEventsProvider({
  enabled,
  children,
}: Readonly<{ enabled: boolean; children: React.ReactNode }>) {
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<Toast | null>(null);
  const toastIdRef = useRef(0);

  const notify = useCallback((message: string, action?: ToastAction) => {
    setToast({ id: ++toastIdRef.current, message, action });
  }, []);

  const handleMessage = useCallback(
    ({ event, data }: SseMessage) => {
      switch (event) {
        case "message.received": {
          const payload = parse<{ messageId: string; threadId: string }>(data);
          invalidateInbox(queryClient, payload ? [payload.threadId] : []);
          if (!payload) return;
          queryClient
            .fetchQuery({
              queryKey: inboxKeys.thread(payload.threadId),
              queryFn: ({ signal }) => getThread(payload.threadId, signal),
            })
            .then((thread) => {
              const message = thread.messages.find((item) => item.id === payload.messageId);
              notify(`New message from ${message?.fromName || message?.fromEmail || "a contact"}`);
            })
            .catch(() => notify("New message received"));
          return;
        }
        case "message.sent":
        case "message.failed": {
          const payload = parse<{ messageId: string; error: string | null }>(data);
          void queryClient.invalidateQueries({ queryKey: inboxKeys.threads() });
          invalidateInbox(queryClient);
          if (event === "message.sent") {
            notify("Message sent");
            return;
          }
          notify(
            payload?.error ? `Failed to send: ${payload.error}` : "Failed to send",
            payload
              ? {
                  label: "Retry",
                  onClick: () => {
                    retrySend(payload.messageId)
                      .then(() => {
                        notify("Sending…");
                        void queryClient.invalidateQueries({ queryKey: inboxKeys.threads() });
                      })
                      .catch((error) => notify(toInboxError(error).message));
                  },
                }
              : undefined,
          );
          return;
        }
        case "counts.updated":
          void queryClient.invalidateQueries({ queryKey: inboxKeys.counts() });
          return;
      }
    },
    [notify, queryClient],
  );

  // Latest handler without reconnecting when it changes.
  const handlerRef = useRef(handleMessage);
  useEffect(() => {
    handlerRef.current = handleMessage;
  }, [handleMessage]);

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();
    const { signal } = controller;
    let pollTimer: ReturnType<typeof setInterval> | undefined;
    let hasConnected = false;

    const startPolling = () => {
      pollTimer ??= setInterval(
        () => void queryClient.invalidateQueries({ queryKey: inboxKeys.counts() }),
        POLL_INTERVAL_MS,
      );
    };
    const stopPolling = () => {
      clearInterval(pollTimer);
      pollTimer = undefined;
    };

    const connect = async () => {
      let failures = 0;
      while (!signal.aborted) {
        const token = getToken();
        if (!token) return;
        try {
          await streamSse(INBOX_EVENTS_URL, {
            headers: { Authorization: `Bearer ${token}` },
            signal,
            onOpen: () => {
              // Catch up on anything missed while disconnected.
              if (hasConnected) invalidateInbox(queryClient);
              hasConnected = true;
              failures = 0;
              stopPolling();
            },
            onMessage: (message) => handlerRef.current(message),
          });
        } catch (error) {
          if (signal.aborted) return;
          // Signed out or no permission: retrying won't help. The api client
          // handles 401s for regular requests.
          if (error instanceof SseHttpError && (error.status === 401 || error.status === 403)) {
            return;
          }
        }
        if (signal.aborted) return;
        failures++;
        if (failures >= POLL_AFTER_FAILURES) startPolling();
        const backoff = Math.min(RECONNECT_BASE_MS * 2 ** failures, RECONNECT_MAX_MS);
        await wait(backoff + Math.random() * 500, signal);
      }
    };

    void connect();
    return () => {
      controller.abort();
      stopPolling();
    };
  }, [enabled, queryClient]);

  const contextValue = useMemo(() => ({ notify }), [notify]);

  return (
    <InboxToastContext.Provider value={contextValue}>
      {children}
      <Snackbar
        key={toast?.id}
        open={toast !== null}
        autoHideDuration={toast?.action ? 8000 : 4000}
        onClose={(_, reason) => {
          if (reason !== "clickaway") setToast(null);
        }}
        message={toast?.message}
        action={
          toast?.action ? (
            <Button
              size="small"
              color="inherit"
              onClick={() => {
                toast.action?.onClick();
                setToast(null);
              }}
              sx={{ fontWeight: 700 }}
            >
              {toast.action.label}
            </Button>
          ) : undefined
        }
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      />
    </InboxToastContext.Provider>
  );
}
