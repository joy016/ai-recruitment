"use client";

import { useCallback, useRef, useState } from "react";
import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from "@tanstack/react-query";
import {
  bulkAction,
  deletePermanent,
  getCounts,
  getMessages,
  getTemplates,
  getThread,
  patchMessage,
  sendEmail,
  toInboxError,
} from "@/lib/api/inbox";
import type {
  BulkAction,
  GetMessagesParams,
  InboxThread,
  InboxThreadListItem,
  InboxThreadListResponse,
  SendEmailPayload,
} from "@/lib/types/inbox";

export const INBOX_PAGE_SIZE = 20;

export const inboxKeys = {
  all: ["inbox"] as const,
  lists: () => ["inbox", "messages"] as const,
  list: (params: Omit<GetMessagesParams, "page">) => ["inbox", "messages", params] as const,
  counts: () => ["inbox", "counts"] as const,
  threads: () => ["inbox", "thread"] as const,
  thread: (threadId: string) => ["inbox", "thread", threadId] as const,
  templates: () => ["inbox", "templates"] as const,
};

type ListData = InfiniteData<InboxThreadListResponse, number>;

/** Conversations for one folder/filter/search; pages load with "Load more". */
export function useInboxMessages(params: Omit<GetMessagesParams, "page" | "pageSize">, enabled = true) {
  const query = { ...params, pageSize: INBOX_PAGE_SIZE };
  return useInfiniteQuery({
    queryKey: inboxKeys.list(query),
    queryFn: ({ pageParam }) => getMessages({ ...query, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page * last.pageSize < last.total ? last.page + 1 : undefined,
    // Keep the old rows on screen while a new search or filter loads.
    placeholderData: keepPreviousData,
    enabled,
  });
}

/**
 * Folder, label and unread counts. Shared by the folder pane, the sidebar
 * badge and the header mail icon, so all three stay in sync.
 */
export function useInboxCounts(enabled = true) {
  return useQuery({
    queryKey: inboxKeys.counts(),
    queryFn: getCounts,
    enabled,
    refetchOnWindowFocus: true,
  });
}

export function useInboxThread(threadId: string | null) {
  return useQuery({
    queryKey: inboxKeys.thread(threadId ?? ""),
    queryFn: ({ signal }) => getThread(threadId ?? "", signal),
    enabled: threadId !== null,
    // Attachment URLs are short-lived signed URLs.
    staleTime: 15_000,
  });
}

export function useEmailTemplates(enabled = true) {
  return useQuery({
    queryKey: inboxKeys.templates(),
    queryFn: getTemplates,
    enabled,
    staleTime: 5 * 60_000,
    select: (templates) =>
      templates.filter((template) => template.isActive).sort((a, b) => a.sortOrder - b.sortOrder),
  });
}

export const invalidateInbox = (queryClient: QueryClient, threadIds: string[] = []) => {
  void queryClient.invalidateQueries({ queryKey: inboxKeys.lists() });
  void queryClient.invalidateQueries({ queryKey: inboxKeys.counts() });
  threadIds.forEach((threadId) =>
    queryClient.invalidateQueries({ queryKey: inboxKeys.thread(threadId) }),
  );
};

/** Applies `change` to every cached list row; returns a rollback. */
const updateListRows = (
  queryClient: QueryClient,
  change: (row: InboxThreadListItem) => InboxThreadListItem | null,
) => {
  const snapshot = queryClient.getQueriesData<ListData>({ queryKey: inboxKeys.lists() });
  queryClient.setQueriesData<ListData>({ queryKey: inboxKeys.lists() }, (data) =>
    data
      ? {
          ...data,
          pages: data.pages.map((page) => {
            const items = page.items.flatMap((row) => {
              const next = change(row);
              return next ? [next] : [];
            });
            return { ...page, items, total: page.total - (page.items.length - items.length) };
          }),
        }
      : data,
  );
  return () => snapshot.forEach(([key, data]) => queryClient.setQueryData(key, data));
};

const updateThread = (
  queryClient: QueryClient,
  threadId: string,
  change: (thread: InboxThread) => InboxThread,
) => {
  const key = inboxKeys.thread(threadId);
  const previous = queryClient.getQueryData<InboxThread>(key);
  if (previous) queryClient.setQueryData(key, change(previous));
  return () => {
    if (previous) queryClient.setQueryData(key, previous);
  };
};

export type ThreadMoveAction = Extract<BulkAction, "archive" | "trash" | "restore">;

/**
 * Conversation-level actions. The API works on message ids while the list
 * only has thread ids, so each action first loads the thread (usually from
 * cache). Updates are optimistic and roll back if the request fails.
 */
export function useThreadActions() {
  const queryClient = useQueryClient();

  const loadThread = useCallback(
    (threadId: string) =>
      queryClient.fetchQuery({
        queryKey: inboxKeys.thread(threadId),
        queryFn: ({ signal }) => getThread(threadId, signal),
        staleTime: 15_000,
      }),
    [queryClient],
  );

  const messageIdsOf = useCallback(
    async (threadIds: string[]) => {
      const threads = await Promise.all(threadIds.map(loadThread));
      return threads.flatMap((thread) => thread.messages.map((message) => message.id));
    },
    [loadThread],
  );

  /** Runs `request` after `optimistic`; rolls back and rethrows on failure. */
  const run = useCallback(
    async (threadIds: string[], optimistic: () => Array<() => void>, request: () => Promise<unknown>) => {
      await queryClient.cancelQueries({ queryKey: inboxKeys.lists() });
      const rollbacks = optimistic();
      try {
        await request();
      } catch (error) {
        rollbacks.forEach((rollback) => rollback());
        throw toInboxError(error);
      } finally {
        invalidateInbox(queryClient, threadIds);
      }
    },
    [queryClient],
  );

  const toggleStar = useCallback(
    (threadId: string, starred: boolean) =>
      run(
        [threadId],
        () => [
          updateListRows(queryClient, (row) => (row.threadId === threadId ? { ...row, isStarred: starred } : row)),
          updateThread(queryClient, threadId, (thread) => ({
            ...thread,
            messages: thread.messages.map((message, index) =>
              starred
                ? index === thread.messages.length - 1
                  ? { ...message, isStarred: true }
                  : message
                : { ...message, isStarred: false },
            ),
          })),
        ],
        async () => {
          const thread = await loadThread(threadId);
          // Starring marks the latest message; unstarring clears every star,
          // since a thread counts as starred while any message is.
          const targets = starred
            ? thread.messages.slice(-1)
            : thread.messages.filter((message) => message.isStarred);
          await Promise.all(targets.map((message) => patchMessage(message.id, { isStarred: starred })));
        },
      ),
    [loadThread, queryClient, run],
  );

  const move = useCallback(
    (threadIds: string[], action: ThreadMoveAction) =>
      run(
        threadIds,
        () => [updateListRows(queryClient, (row) => (threadIds.includes(row.threadId) ? null : row))],
        async () => bulkAction(await messageIdsOf(threadIds), action),
      ),
    [messageIdsOf, queryClient, run],
  );

  const setRead = useCallback(
    (threadIds: string[], read: boolean) =>
      run(
        threadIds,
        () => [
          updateListRows(queryClient, (row) =>
            threadIds.includes(row.threadId)
              ? { ...row, unreadCount: read ? 0 : Math.max(row.unreadCount, 1) }
              : row,
          ),
          ...threadIds.map((threadId) =>
            updateThread(queryClient, threadId, (thread) => ({
              ...thread,
              messages: thread.messages.map((message) =>
                message.direction === "Inbound" ? { ...message, isRead: read } : message,
              ),
            })),
          ),
        ],
        async () => {
          const threads = await Promise.all(threadIds.map(loadThread));
          const ids = threads.flatMap((thread) =>
            thread.messages
              .filter((message) => message.direction === "Inbound")
              .map((message) => message.id),
          );
          if (ids.length > 0) await bulkAction(ids, read ? "markRead" : "markUnread");
        },
      ),
    [loadThread, queryClient, run],
  );

  /** Marks only the unread inbound messages of an open thread as read. */
  const markThreadRead = useCallback(
    (thread: InboxThread) => {
      const unreadIds = thread.messages
        .filter((message) => message.direction === "Inbound" && !message.isRead)
        .map((message) => message.id);
      if (unreadIds.length === 0) return Promise.resolve();
      return run(
        [thread.threadId],
        () => [
          updateListRows(queryClient, (row) =>
            row.threadId === thread.threadId ? { ...row, unreadCount: 0 } : row,
          ),
          updateThread(queryClient, thread.threadId, (current) => ({
            ...current,
            messages: current.messages.map((message) =>
              unreadIds.includes(message.id) ? { ...message, isRead: true } : message,
            ),
          })),
        ],
        () => bulkAction(unreadIds, "markRead"),
      );
    },
    [queryClient, run],
  );

  /** Permanently deletes conversations that are in Trash. */
  const deleteForever = useCallback(
    (threadIds: string[]) =>
      run(
        threadIds,
        () => [updateListRows(queryClient, (row) => (threadIds.includes(row.threadId) ? null : row))],
        async () => {
          const ids = await messageIdsOf(threadIds);
          // The endpoint refuses messages not flagged as deleted; a thread is
          // in Trash when its latest message is, so flag the rest first.
          await bulkAction(ids, "trash");
          await Promise.all(ids.map(deletePermanent));
          threadIds.forEach((threadId) =>
            queryClient.removeQueries({ queryKey: inboxKeys.thread(threadId) }),
          );
        },
      ),
    [messageIdsOf, queryClient, run],
  );

  return { loadThread, toggleStar, move, setRead, markThreadRead, deleteForever };
}

const newIdempotencyKey = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;

/**
 * The one send flow for Compose, Reply, Reply all, Forward and Quick reply.
 * Each attempt gets one Idempotency-Key. After a network error the key is
 * kept, so retrying the same attempt can't send twice; any other outcome (or
 * `resetAttempt` when the content changes) starts a new attempt.
 */
export function useSendEmail() {
  const queryClient = useQueryClient();
  const keyRef = useRef<string | null>(null);
  const sendingRef = useRef(false);
  const [isSending, setIsSending] = useState(false);

  const resetAttempt = useCallback(() => {
    if (!sendingRef.current) keyRef.current = null;
  }, []);

  const send = useCallback(
    async (payload: SendEmailPayload, threadId?: string) => {
      if (sendingRef.current) return null; // double click
      sendingRef.current = true;
      setIsSending(true);
      keyRef.current ??= newIdempotencyKey();
      try {
        const response = await sendEmail(payload, keyRef.current);
        keyRef.current = null;
        invalidateInbox(queryClient, threadId ? [threadId] : []);
        return response;
      } catch (error) {
        const inboxError = toInboxError(error);
        if (!inboxError.isNetworkError) keyRef.current = null;
        throw inboxError;
      } finally {
        sendingRef.current = false;
        setIsSending(false);
      }
    },
    [queryClient],
  );

  return { send, isSending, resetAttempt };
}
