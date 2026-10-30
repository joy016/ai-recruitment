"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Drawer,
  Paper,
  Snackbar,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  EMPTY_DRAFT,
  FOLDERS,
  INBOX_COLORS,
  LABELS,
} from "../(constants)/inbox.constants";
import { CURRENT_USER, MOCK_THREADS } from "../(constants)/mockInbox";
import type {
  ComposeDraft,
  FolderId,
  InboxMessage,
  InboxThread,
  LabelId,
  MessageFilter,
  MessageSort,
} from "../(types)/inbox.types";
import { formatFullDateTime, getVisibleThreads } from "../(utils)/inbox.utils";
import ComposeDialog from "./ComposeDialog";
import FolderList from "./FolderList";
import InboxEmptyState from "./InboxEmptyState";
import { MessageViewerSkeleton } from "./InboxSkeletons";
import MessageList from "./MessageList";
import MessageViewer, { type ReplyMode } from "./MessageViewer";

// Simulated latency so the loading skeletons are visible in the design.
const MOCK_LIST_DELAY_MS = 700;
const MOCK_VIEWER_DELAY_MS = 350;

// Header + page padding, plus room so the card ends above the global
// "Chat AI" button (fixed bottom-right; top edge 72px up, 64px on phones)
// instead of it covering the quick-reply Send button.
const CARD_HEIGHT = {
  xs: "calc(100dvh - 146px)",
  sm: "calc(100dvh - 164px)",
  md: "calc(100dvh - 180px)",
};

type ComposeState = { key: number; title: string; draft: ComposeDraft };

const withPrefix = (prefix: string, subject: string) =>
  subject.toLowerCase().startsWith(prefix.toLowerCase()) ? subject : `${prefix} ${subject}`;

const quote = (message: InboxMessage) =>
  `\n\nOn ${formatFullDateTime(message.sentAt)}, ${message.from.name} wrote:\n${message.body
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n")}`;

const notMe = (email: string) => email.toLowerCase() !== CURRENT_USER.email.toLowerCase();

const buildReplyDraft = (
  mode: ReplyMode,
  thread: InboxThread,
  message: InboxMessage,
  body = "",
): ComposeDraft => {
  if (mode === "forward") {
    return {
      ...EMPTY_DRAFT,
      subject: withPrefix("Fwd:", thread.subject),
      body: `${body}\n\n---------- Forwarded message ----------\nFrom: ${message.from.name} <${message.from.email}>\nDate: ${formatFullDateTime(message.sentAt)}\nSubject: ${thread.subject}\n\n${message.body}`,
    };
  }

  const sentByMe = !notMe(message.from.email);
  const to = sentByMe ? message.to.map((contact) => contact.email) : [message.from.email];
  const cc =
    mode === "replyAll"
      ? [...message.to, ...(message.cc ?? [])]
          .map((contact) => contact.email)
          .filter((email) => notMe(email) && !to.includes(email))
      : [];

  return {
    to,
    cc,
    bcc: [],
    subject: withPrefix("Re:", thread.subject),
    body: `${body}${quote(message)}`,
  };
};

export default function InboxPage() {
  const theme = useTheme();
  const isXl = useMediaQuery(theme.breakpoints.up("xl"));
  const isMdUp = useMediaQuery(theme.breakpoints.up("md"));
  // Side-by-side list + reading pane; below this one pane shows at a time.
  const isSplit = useMediaQuery(theme.breakpoints.up("lg"));

  const [threads, setThreads] = useState<InboxThread[]>(MOCK_THREADS);
  const [folder, setFolder] = useState<FolderId>("inbox");
  const [label, setLabel] = useState<LabelId | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<MessageFilter>("all");
  const [sort, setSort] = useState<MessageSort>("newest");
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set());
  const [isListLoading, setIsListLoading] = useState(true);
  const [isViewerLoading, setIsViewerLoading] = useState(false);
  const [folderDrawerOpen, setFolderDrawerOpen] = useState(false);
  const [compose, setCompose] = useState<ComposeState | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const viewerTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // TODO(wire-up): replace with the mail API request.
  useEffect(() => {
    const timer = setTimeout(() => setIsListLoading(false), MOCK_LIST_DELAY_MS);
    return () => {
      clearTimeout(timer);
      clearTimeout(viewerTimerRef.current);
    };
  }, []);

  const visibleThreads = useMemo(
    () => getVisibleThreads(threads, { folder, label, filter, sort, search }),
    [threads, folder, label, filter, sort, search],
  );
  const selectedThread = threads.find((thread) => thread.id === selectedThreadId) ?? null;
  const visibleCheckedIds = visibleThreads.filter((thread) => checkedIds.has(thread.id)).map((thread) => thread.id);

  const title = label
    ? LABELS[label].label
    : (FOLDERS.find((item) => item.id === folder)?.label ?? "Inbox");

  const updateThreads = (ids: string[], change: (thread: InboxThread) => InboxThread | null) =>
    setThreads((current) =>
      current.flatMap((thread) => {
        if (!ids.includes(thread.id)) return [thread];
        const next = change(thread);
        return next ? [next] : [];
      }),
    );

  const closeThreadIfAffected = (ids: string[]) => {
    if (selectedThreadId && ids.includes(selectedThreadId)) setSelectedThreadId(null);
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

  const openThread = (threadId: string) => {
    setSelectedThreadId(threadId);
    updateThreads([threadId], (thread) => ({ ...thread, isUnread: false }));
    setIsViewerLoading(true);
    clearTimeout(viewerTimerRef.current);
    viewerTimerRef.current = setTimeout(() => setIsViewerLoading(false), MOCK_VIEWER_DELAY_MS);
  };

  const toggleStar = (threadId: string) =>
    updateThreads([threadId], (thread) => ({ ...thread, isStarred: !thread.isStarred }));

  const archive = (ids: string[]) => {
    updateThreads(ids, (thread) => ({ ...thread, folder: "archived" }));
    closeThreadIfAffected(ids);
    setToast(ids.length === 1 ? "Conversation archived." : `${ids.length} conversations archived.`);
  };

  // Trash first; deleting from Trash removes it from the mock list.
  const remove = (ids: string[]) => {
    updateThreads(ids, (thread) => (thread.folder === "trash" ? null : { ...thread, folder: "trash" }));
    closeThreadIfAffected(ids);
    setToast(ids.length === 1 ? "Conversation moved to Trash." : `${ids.length} conversations moved to Trash.`);
  };

  const markRead = (ids: string[]) => updateThreads(ids, (thread) => ({ ...thread, isUnread: false }));

  const markUnread = (threadId: string) => {
    updateThreads([threadId], (thread) => ({ ...thread, isUnread: true }));
    setSelectedThreadId(null);
  };

  const runBulk = (action: (ids: string[]) => void) => {
    action(visibleCheckedIds);
    setCheckedIds(new Set());
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
      visibleCheckedIds.length === visibleThreads.length
        ? new Set()
        : new Set(visibleThreads.map((thread) => thread.id)),
    );

  const openCompose = (draft: ComposeDraft = EMPTY_DRAFT, composeTitle = "New Message") =>
    setCompose((current) => ({ key: (current?.key ?? 0) + 1, title: composeTitle, draft }));

  const openReply = (mode: ReplyMode, message: InboxMessage, body?: string) => {
    if (!selectedThread) return;
    const titles: Record<ReplyMode, string> = { reply: "Reply", replyAll: "Reply all", forward: "Forward" };
    openCompose(buildReplyDraft(mode, selectedThread, message, body), titles[mode]);
  };

  const folderList = (variant: "full" | "rail") => (
    <FolderList
      threads={threads}
      activeFolder={folder}
      activeLabel={label}
      onSelectFolder={selectFolder}
      onSelectLabel={selectLabel}
      onCompose={() => {
        setFolderDrawerOpen(false);
        openCompose();
      }}
      variant={variant}
    />
  );

  const list = (
    <MessageList
      title={title}
      threads={visibleThreads}
      isLoading={isListLoading}
      selectedThreadId={selectedThreadId}
      checkedIds={checkedIds}
      showRecipient={!label && (folder === "sent" || folder === "drafts")}
      search={search}
      filter={filter}
      sort={sort}
      onSearchChange={setSearch}
      onFilterChange={setFilter}
      onSortChange={setSort}
      onOpenThread={openThread}
      onToggleCheck={toggleCheck}
      onToggleCheckAll={toggleCheckAll}
      onToggleStar={toggleStar}
      onBulkArchive={() => runBulk(archive)}
      onBulkDelete={() => runBulk(remove)}
      onBulkMarkRead={() => runBulk(markRead)}
      onOpenFolders={isMdUp ? undefined : () => setFolderDrawerOpen(true)}
    />
  );

  const renderViewer = () => {
    if (isListLoading || (selectedThread && isViewerLoading)) {
      return <MessageViewerSkeleton />;
    }
    if (!selectedThread) {
      return (
        <InboxEmptyState
          illustration="noSelection"
          title="No message selected"
          description="Choose a conversation from the list to read it here."
        />
      );
    }
    return (
      <MessageViewer
        key={selectedThread.id}
        thread={selectedThread}
        onBack={isSplit ? undefined : () => setSelectedThreadId(null)}
        onCompose={openReply}
        onArchive={(id) => archive([id])}
        onDelete={(id) => remove([id])}
        onToggleStar={toggleStar}
        onMarkUnread={markUnread}
        onNotify={setToast}
      />
    );
  };

  const paneBorder = `1px solid ${INBOX_COLORS.divider}`;
  const showViewerOnly = !isSplit && selectedThread !== null;

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
          open
          title={compose.title}
          initialDraft={compose.draft}
          onClose={() => setCompose(null)}
          onSend={() => {
            setCompose(null);
            setToast("Preview only: sending isn't connected yet.");
          }}
          onSaveDraft={() => {
            setCompose(null);
            setToast("Preview only: draft not saved.");
          }}
          onNotify={setToast}
        />
      )}

      <Snackbar
        open={toast !== null}
        autoHideDuration={3500}
        onClose={() => setToast(null)}
        message={toast}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      />
    </>
  );
}
