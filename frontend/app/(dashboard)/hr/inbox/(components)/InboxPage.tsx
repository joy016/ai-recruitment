"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Box,
  Button,
  Drawer,
  Paper,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import ConfirmationModal from "@/app/component/ConfirmationModal";
import { useInboxToast } from "@/app/component/InboxEventsProvider";
import { PERMISSIONS } from "@/constant/permissions";
import { retrySend, toInboxError } from "@/lib/api/inbox";
import {
  invalidateInbox,
  useInboxCounts,
  useInboxMessages,
  useInboxThread,
  useSendEmail,
  useThreadActions,
  type ThreadMoveAction,
} from "@/lib/hooks/useInbox";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { useAppSelector } from "@/lib/store/hooks";
import type { EmailMessage, InboxThread } from "@/lib/types/inbox";
import { htmlToText, textToHtml } from "@/lib/utils/emailHtml";
import { useQueryClient } from "@tanstack/react-query";
import {
  EMPTY_DRAFT,
  FOLDERS,
  INBOX_COLORS,
  LABELS,
  SEARCH_DEBOUNCE_MS,
} from "../(constants)/inbox.constants";
import type {
  ComposeInit,
  FolderId,
  KnownRecipient,
  LabelId,
  MessageFilter,
  MessageSort,
} from "../(types)/inbox.types";
import {
  buildReplyInit,
  getCounterpart,
  validateOutgoing,
  withPrefix,
  type ReplyMode,
} from "../(utils)/inbox.utils";
import ComposeDialog from "./ComposeDialog";
import FolderList from "./FolderList";
import InboxEmptyState from "./InboxEmptyState";
import { MessageViewerSkeleton } from "./InboxSkeletons";
import MessageList, { type BulkListAction } from "./MessageList";
import MessageViewer from "./MessageViewer";

// Header + page padding, plus room so the card ends above the global
// "Chat AI" button (fixed bottom-right; top edge 72px up, 64px on phones)
// instead of it covering the quick-reply Send button.
const CARD_HEIGHT = {
  xs: "calc(100dvh - 146px)",
  sm: "calc(100dvh - 164px)",
  md: "calc(100dvh - 180px)",
};

const MOVE_MESSAGES: Record<ThreadMoveAction, (count: number) => string> = {
  archive: (count) => (count === 1 ? "Conversation archived." : `${count} conversations archived.`),
  trash: (count) => (count === 1 ? "Conversation moved to Trash." : `${count} conversations moved to Trash.`),
  restore: (count) => (count === 1 ? "Conversation restored." : `${count} conversations restored.`),
};

const visuallyHidden = {
  position: "absolute",
  width: 1,
  height: 1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
} as const;

/** Reopens a message from Drafts in the composer. */
const buildDraftInit = (thread: InboxThread, draft: EmailMessage): ComposeInit => {
  const original = thread.messages.filter((message) => message.status !== "Draft").at(-1);
  return {
    title: "Draft",
    mode: original ? "reply" : "new",
    replyToMessageId: original?.id,
    draftId: draft.id,
    threadId: thread.threadId,
    draft: {
      to: draft.toEmails,
      cc: draft.ccEmails,
      bcc: draft.bccEmails,
      subject: draft.subject,
      body: htmlToText(draft.bodyHtml),
      attachments: draft.attachments,
    },
  };
};

export default function InboxPage() {
  const theme = useTheme();
  const isXl = useMediaQuery(theme.breakpoints.up("xl"));
  const isMdUp = useMediaQuery(theme.breakpoints.up("md"));
  // Side-by-side list + reading pane; below this one pane shows at a time.
  const isSplit = useMediaQuery(theme.breakpoints.up("lg"));
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { notify } = useInboxToast();
  const { hasPermission } = usePermissions();
  const canSend = hasPermission(PERMISSIONS.inbox.send);
  const userEmail = useAppSelector((state) => state.user.currentUser?.email);

  const [folder, setFolder] = useState<FolderId>("inbox");
  const [label, setLabel] = useState<LabelId | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<MessageFilter>("all");
  const [sort, setSort] = useState<MessageSort>("newest");
  // Opened from the header preview: /hr/inbox?thread=<id>.
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(() => searchParams.get("thread"));
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set());
  const [folderDrawerOpen, setFolderDrawerOpen] = useState(false);
  const [compose, setCompose] = useState<{ key: number; init: ComposeInit } | null>(null);
  const [deleteForeverIds, setDeleteForeverIds] = useState<string[] | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const messagesQuery = useInboxMessages({ folder, search, filter, label, sort });
  const countsQuery = useInboxCounts();
  const threadQuery = useInboxThread(selectedThreadId);
  const actions = useThreadActions();
  const quickReply = useSendEmail();
  const lastQuickReplyRef = useRef("");

  // Search waits for typing to pause; a new query key starts at page 1.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Follow ?thread= when the header preview links here again.
  const threadParam = searchParams.get("thread");
  const [lastThreadParam, setLastThreadParam] = useState(threadParam);
  if (threadParam !== lastThreadParam) {
    setLastThreadParam(threadParam);
    if (threadParam) {
      setFolder("inbox");
      setLabel(null);
      setSelectedThreadId(threadParam);
    }
  }

  const threads = messagesQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const total = messagesQuery.data?.pages[0]?.total ?? 0;
  const selectedThread = threadQuery.data ?? null;
  const visibleCheckedIds = threads.filter((thread) => checkedIds.has(thread.threadId)).map((thread) => thread.threadId);

  const title = label
    ? LABELS[label].label
    : (FOLDERS.find((item) => item.id === folder)?.label ?? "Inbox");

  // Candidate addresses seen so far, for recipient suggestions and names.
  const knownRecipients: KnownRecipient[] = [];
  const seen = new Set<string>();
  const addRecipient = (email: string, name: string) => {
    const key = email.toLowerCase();
    if (!email || seen.has(key)) return;
    seen.add(key);
    knownRecipients.push({ email, name });
  };
  if (selectedThread?.candidate) {
    addRecipient(getCounterpart(selectedThread).email, selectedThread.candidate.fullName);
  }
  threads.forEach((row) => {
    if (row.candidate && row.senderName.toLowerCase() === row.candidate.fullName.toLowerCase()) {
      addRecipient(row.senderEmail, row.candidate.fullName);
    }
  });

  const announce = (message: string) => setAnnouncement(message);

  const reportError = (error: unknown, retry?: () => void) => {
    const inboxError = toInboxError(error);
    notify(inboxError.message, inboxError.isNetworkError && retry ? { label: "Retry", onClick: retry } : undefined);
  };

  const resetView = () => {
    setSelectedThreadId(null);
    setCheckedIds(new Set());
    setFolderDrawerOpen(false);
  };

  const selectFolder = (next: FolderId) => {
    setFolder(next);
    setLabel(null);
    resetView();
  };

  const selectLabel = (next: LabelId) => {
    setLabel(next);
    resetView();
  };

  const closeThreadIfAffected = (ids: string[]) => {
    if (selectedThreadId && ids.includes(selectedThreadId)) setSelectedThreadId(null);
  };

  const openCompose = (init: ComposeInit) =>
    setCompose((current) => ({ key: (current?.key ?? 0) + 1, init }));

  const openNewMessage = () => {
    setFolderDrawerOpen(false);
    openCompose({ title: "New Message", mode: "new", draft: EMPTY_DRAFT });
  };

  const openDraft = (threadId: string) =>
    actions
      .loadThread(threadId)
      .then((thread) => {
        const draft = thread.messages.findLast((message) => message.status === "Draft");
        if (draft && canSend) openCompose(buildDraftInit(thread, draft));
        else setSelectedThreadId(threadId);
      })
      .catch((error) => reportError(error, () => void openDraft(threadId)));

  const openThread = (threadId: string) => {
    if (folder === "drafts") void openDraft(threadId);
    else setSelectedThreadId(threadId);
  };

  const openReply = (mode: ReplyMode, message: EmailMessage, body?: string) => {
    if (!selectedThread) return;
    openCompose(buildReplyInit(mode, selectedThread, message, body, userEmail));
  };

  const move = (ids: string[], action: ThreadMoveAction) => {
    closeThreadIfAffected(ids);
    actions
      .move(ids, action)
      .then(() => {
        notify(MOVE_MESSAGES[action](ids.length));
        announce(MOVE_MESSAGES[action](ids.length));
      })
      .catch((error) => reportError(error, () => move(ids, action)));
  };

  const setRead = (ids: string[], read: boolean) =>
    actions.setRead(ids, read).catch((error) => reportError(error, () => void setRead(ids, read)));

  const toggleStar = (threadId: string, starred: boolean) =>
    actions.toggleStar(threadId, starred).catch((error) => reportError(error, () => void toggleStar(threadId, starred)));

  const markUnread = (threadId: string) => {
    setSelectedThreadId(null);
    void setRead([threadId], false);
  };

  const runBulk = (action: BulkListAction) => {
    const ids = visibleCheckedIds;
    if (ids.length === 0) return;
    if (action === "deleteForever") {
      setDeleteForeverIds(ids);
      return;
    }
    setCheckedIds(new Set());
    if (action === "markRead" || action === "markUnread") void setRead(ids, action === "markRead");
    else move(ids, action);
  };

  const toggleCheck = (threadId: string) =>
    setCheckedIds((current) => {
      const next = new Set(current);
      if (next.has(threadId)) next.delete(threadId);
      else next.add(threadId);
      return next;
    });

  const toggleCheckAll = () =>
    setCheckedIds(
      visibleCheckedIds.length === threads.length
        ? new Set()
        : new Set(threads.map((thread) => thread.threadId)),
    );

  /** The inline reply box: same validation and send flow as Compose. */
  const sendQuickReply = async (body: string) => {
    const thread = selectedThread;
    const latest = thread?.messages.at(-1);
    if (!thread || !latest) return false;
    // Edited text after a failed attempt is a new attempt.
    if (body !== lastQuickReplyRef.current) quickReply.resetAttempt();
    lastQuickReplyRef.current = body;

    const draft = {
      to: [getCounterpart(thread).email].filter(Boolean),
      cc: [],
      bcc: [],
      subject: withPrefix("Re:", thread.subject),
      body,
    };
    const firstError = Object.values(validateOutgoing(draft))[0];
    if (firstError) {
      notify(firstError);
      return false;
    }
    try {
      const response = await quickReply.send(
        {
          ...draft,
          bodyHtml: textToHtml(body),
          attachmentIds: [],
          mode: "reply",
          replyToMessageId: latest.id,
        },
        thread.threadId,
      );
      if (!response) return false;
      notify("Sending…");
      announce("Reply is sending.");
      lastQuickReplyRef.current = "";
      return true;
    } catch (error) {
      reportError(error);
      announce("Reply wasn't sent.");
      return false;
    }
  };

  const retryFailed = (messageId: string) =>
    retrySend(messageId)
      .then(() => {
        notify("Sending…");
        invalidateInbox(queryClient, selectedThreadId ? [selectedThreadId] : []);
      })
      .catch((error) => reportError(error, () => void retryFailed(messageId)));

  const folderList = (variant: "full" | "rail") => (
    <FolderList
      counts={countsQuery.data}
      isCountsLoading={countsQuery.isPending}
      canCompose={canSend}
      activeFolder={folder}
      activeLabel={label}
      onSelectFolder={selectFolder}
      onSelectLabel={selectLabel}
      onCompose={openNewMessage}
      variant={variant}
    />
  );

  const list = (
    <MessageList
      title={title}
      folder={folder}
      threads={threads}
      total={total}
      isLoading={messagesQuery.isPending}
      isFetching={messagesQuery.isFetching && !messagesQuery.isFetchingNextPage}
      errorMessage={messagesQuery.isError ? toInboxError(messagesQuery.error).message : null}
      onRetry={() => void messagesQuery.refetch()}
      hasMore={messagesQuery.hasNextPage}
      isLoadingMore={messagesQuery.isFetchingNextPage}
      onLoadMore={() => void messagesQuery.fetchNextPage()}
      selectedThreadId={selectedThreadId}
      checkedIds={checkedIds}
      search={searchInput}
      filter={filter}
      sort={sort}
      onSearchChange={(value) => {
        setSearchInput(value);
        setCheckedIds(new Set());
      }}
      onFilterChange={(value) => {
        setFilter(value);
        setCheckedIds(new Set());
      }}
      onSortChange={setSort}
      onOpenThread={openThread}
      onToggleCheck={toggleCheck}
      onToggleCheckAll={toggleCheckAll}
      onToggleStar={(threadId, starred) => void toggleStar(threadId, starred)}
      onBulkAction={runBulk}
      onOpenFolders={isMdUp ? undefined : () => setFolderDrawerOpen(true)}
    />
  );

  const renderViewer = () => {
    if (!selectedThreadId) {
      return (
        <InboxEmptyState
          illustration="noSelection"
          title="No message selected"
          description="Choose a conversation from the list to read it here."
        />
      );
    }
    if (threadQuery.isPending) return <MessageViewerSkeleton />;
    if (threadQuery.isError || !selectedThread) {
      const error = toInboxError(threadQuery.error);
      return (
        <InboxEmptyState
          illustration="noResults"
          title={error.status === 404 ? "Conversation not found" : "Couldn't load this conversation"}
          description={error.status === 404 ? "It may have been deleted." : error.message}
          action={
            <Box sx={{ display: "flex", gap: 1 }}>
              {!isSplit && (
                <Button size="small" onClick={() => setSelectedThreadId(null)} sx={{ textTransform: "none" }}>
                  Back
                </Button>
              )}
              {error.status !== 404 && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => void threadQuery.refetch()}
                  sx={{ textTransform: "none", borderRadius: 2 }}
                >
                  Retry
                </Button>
              )}
            </Box>
          }
        />
      );
    }
    const threadId = selectedThread.threadId;
    return (
      <MessageViewer
        key={threadId}
        thread={selectedThread}
        folder={folder}
        canSend={canSend}
        onBack={isSplit ? undefined : () => setSelectedThreadId(null)}
        onCompose={openReply}
        onMove={(action) => move([threadId], action)}
        onDeleteForever={() => setDeleteForeverIds([threadId])}
        onToggleStar={(starred) => void toggleStar(threadId, starred)}
        onMarkUnread={() => markUnread(threadId)}
        onMarkRead={() => {
          actions.markThreadRead(selectedThread).catch(() => {
            // Not worth interrupting the reader; the list keeps it bold.
          });
        }}
        onQuickReply={sendQuickReply}
        isSendingQuickReply={quickReply.isSending}
        onRetrySend={(messageId) => void retryFailed(messageId)}
      />
    );
  };

  const paneBorder = `1px solid ${INBOX_COLORS.divider}`;
  const showViewerOnly = !isSplit && selectedThreadId !== null;

  return (
    <>
      <Paper
        elevation={0}
        component="section"
        aria-label="Inbox"
        sx={{
          display: "flex",
          height: CARD_HEIGHT,
          minHeight: 520,
          overflow: "hidden",
          borderRadius: 3,
          border: `1px solid ${INBOX_COLORS.border}`,
          backgroundColor: "#ffffff",
          boxShadow: "0 10px 30px rgba(23, 69, 106, 0.06)",
        }}
      >
        {isMdUp && (
          <Box
            sx={{
              width: isXl ? 228 : 72,
              flexShrink: 0,
              borderRight: paneBorder,
              bgcolor: "#fbfdff",
            }}
          >
            {folderList(isXl ? "full" : "rail")}
          </Box>
        )}

        {(isSplit || !showViewerOnly) && (
          <Box
            sx={{
              width: isSplit ? { lg: 340, xl: 380 } : "100%",
              flexShrink: 0,
              borderRight: isSplit ? paneBorder : "none",
              minWidth: 0,
            }}
          >
            {list}
          </Box>
        )}

        {(isSplit || showViewerOnly) && (
          <Box component="section" aria-label="Reading pane" sx={{ flex: 1, minWidth: 0 }}>
            {renderViewer()}
          </Box>
        )}
      </Paper>

      {!isMdUp && (
        <Drawer
          open={folderDrawerOpen}
          onClose={() => setFolderDrawerOpen(false)}
          slotProps={{ paper: { sx: { width: "min(80vw, 280px)" } } }}
        >
          {folderList("full")}
        </Drawer>
      )}

      {compose && (
        <ComposeDialog
          key={compose.key}
          init={compose.init}
          knownRecipients={knownRecipients}
          onClose={() => {
            setCompose(null);
            announce("Composer closed.");
          }}
        />
      )}

      <ConfirmationModal
        open={deleteForeverIds !== null}
        title="Delete forever?"
        description={
          deleteForeverIds && deleteForeverIds.length > 1
            ? `${deleteForeverIds.length} conversations will be permanently deleted. This can't be undone.`
            : "This conversation will be permanently deleted. This can't be undone."
        }
        confirmLabel="Delete forever"
        confirmTone="danger"
        onConfirm={async () => {
          const ids = deleteForeverIds ?? [];
          closeThreadIfAffected(ids);
          setCheckedIds(new Set());
          await actions.deleteForever(ids);
          const message = ids.length === 1 ? "Conversation deleted forever." : `${ids.length} conversations deleted forever.`;
          notify(message);
          announce(message);
        }}
        onClose={() => setDeleteForeverIds(null)}
      />

      <Box aria-live="polite" role="status" sx={visuallyHidden}>
        {announcement}
      </Box>
    </>
  );
}
