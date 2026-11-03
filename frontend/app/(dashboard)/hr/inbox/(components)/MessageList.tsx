import {
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  ArchiveOutlined,
  Close,
  DeleteForeverOutlined,
  DeleteOutlined,
  DraftsOutlined,
  MarkEmailUnreadOutlined,
  MenuOpen,
  RestoreFromTrash,
  Search,
} from "@mui/icons-material";
import type { InboxThreadListItem } from "@/lib/types/inbox";
import {
  INBOX_COLORS,
  MESSAGE_FILTERS,
  MESSAGE_SORTS,
} from "../(constants)/inbox.constants";
import type { FolderId, MessageFilter, MessageSort } from "../(types)/inbox.types";
import InboxEmptyState from "./InboxEmptyState";
import { MessageListSkeleton } from "./InboxSkeletons";
import MessageListItem from "./MessageListItem";

export type BulkListAction = "archive" | "trash" | "markRead" | "markUnread" | "restore" | "deleteForever";

type MessageListProps = {
  title: string;
  folder: FolderId;
  threads: InboxThreadListItem[];
  total: number;
  /** First load, nothing to show yet. */
  isLoading: boolean;
  /** Refetching (e.g. a new search) while older rows stay visible. */
  isFetching: boolean;
  errorMessage: string | null;
  onRetry: () => void;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  selectedThreadId: string | null;
  checkedIds: Set<string>;
  search: string;
  filter: MessageFilter;
  sort: MessageSort;
  onSearchChange: (value: string) => void;
  onFilterChange: (filter: MessageFilter) => void;
  onSortChange: (sort: MessageSort) => void;
  onOpenThread: (threadId: string) => void;
  onToggleCheck: (threadId: string) => void;
  onToggleCheckAll: () => void;
  onToggleStar: (threadId: string, starred: boolean) => void;
  onBulkAction: (action: BulkListAction) => void;
  /** Mobile only: opens the folder drawer. */
  onOpenFolders?: () => void;
};

const bulkButtonSx = { color: INBOX_COLORS.primary } as const;

export default function MessageList({
  title,
  folder,
  threads,
  total,
  isLoading,
  isFetching,
  errorMessage,
  onRetry,
  hasMore,
  isLoadingMore,
  onLoadMore,
  selectedThreadId,
  checkedIds,
  search,
  filter,
  sort,
  onSearchChange,
  onFilterChange,
  onSortChange,
  onOpenThread,
  onToggleCheck,
  onToggleCheckAll,
  onToggleStar,
  onBulkAction,
  onOpenFolders,
}: Readonly<MessageListProps>) {
  const checkedCount = threads.filter((thread) => checkedIds.has(thread.threadId)).length;
  const allChecked = threads.length > 0 && checkedCount === threads.length;
  const isFiltered = search.trim() !== "" || filter !== "all";
  const inTrash = folder === "trash";

  const bulkButton = (action: BulkListAction, label: string, icon: React.ReactNode) => (
    <Tooltip key={action} title={label}>
      <IconButton size="small" aria-label={`${label} selected`} onClick={() => onBulkAction(action)} sx={bulkButtonSx}>
        {icon}
      </IconButton>
    </Tooltip>
  );

  const renderBody = () => {
    if (isLoading) return <MessageListSkeleton />;

    if (errorMessage && threads.length === 0) {
      return (
        <InboxEmptyState
          illustration="noResults"
          title="Couldn't load messages"
          description={errorMessage}
          action={
            <Button size="small" variant="outlined" onClick={onRetry} sx={{ textTransform: "none", borderRadius: 2 }}>
              Retry
            </Button>
          }
        />
      );
    }

    if (threads.length === 0) {
      return isFiltered ? (
        <InboxEmptyState
          illustration="noResults"
          title="No messages found"
          description="Try a different search term or clear the filters."
          action={
            <Button
              size="small"
              onClick={() => {
                onSearchChange("");
                onFilterChange("all");
              }}
              sx={{ textTransform: "none", color: INBOX_COLORS.primary }}
            >
              Clear search and filters
            </Button>
          }
        />
      ) : (
        <InboxEmptyState
          illustration="emptyInbox"
          title={`${title} is empty`}
          description={
            folder === "inbox" ? "You're all caught up. New messages will show up here." : "Nothing here yet."
          }
        />
      );
    }

    return (
      <>
        <Box component="ul" aria-label={`${title} messages`} sx={{ m: 0, p: 0, listStyle: "none" }}>
          {threads.map((thread) => (
            <MessageListItem
              key={thread.threadId}
              thread={thread}
              selected={thread.threadId === selectedThreadId}
              checked={checkedIds.has(thread.threadId)}
              isDraft={folder === "drafts"}
              onOpen={onOpenThread}
              onToggleCheck={onToggleCheck}
              onToggleStar={onToggleStar}
            />
          ))}
        </Box>
        {hasMore && (
          <Box sx={{ p: 1.5, textAlign: "center" }}>
            <Button
              size="small"
              onClick={onLoadMore}
              disabled={isLoadingMore}
              startIcon={isLoadingMore ? <CircularProgress size={14} color="inherit" /> : undefined}
              sx={{ textTransform: "none", fontWeight: 600, color: INBOX_COLORS.primary }}
            >
              {isLoadingMore ? "Loading…" : "Load more"}
            </Button>
          </Box>
        )}
      </>
    );
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", minWidth: 0 }}>
      <Box sx={{ px: 2, pt: 2, pb: 1.2 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1.5 }}>
          {onOpenFolders && (
            <IconButton
              aria-label="Open folders"
              onClick={onOpenFolders}
              edge="start"
              sx={{ color: INBOX_COLORS.primary }}
            >
              <MenuOpen />
            </IconButton>
          )}
          <Typography
            component="h2"
            sx={{ fontWeight: 700, fontSize: "1.25rem", color: INBOX_COLORS.heading, flex: 1 }}
          >
            {title}
          </Typography>
          <Select
            size="small"
            value={sort}
            onChange={(event) => onSortChange(event.target.value as MessageSort)}
            inputProps={{ "aria-label": "Sort messages" }}
            sx={{
              fontSize: "0.82rem",
              borderRadius: 2,
              color: INBOX_COLORS.text,
              "& .MuiOutlinedInput-notchedOutline": { borderColor: INBOX_COLORS.border },
              "& .MuiSelect-select": { py: 0.6 },
            }}
          >
            {MESSAGE_SORTS.map((option) => (
              <MenuItem key={option.id} value={option.id} sx={{ fontSize: "0.85rem" }}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </Stack>

        <TextField
          fullWidth
          size="small"
          placeholder="Search mail, candidates, subjects…"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          slotProps={{
            htmlInput: { "aria-label": "Search messages" },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: INBOX_COLORS.muted }} />
                </InputAdornment>
              ),
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton size="small" aria-label="Clear search" onClick={() => onSearchChange("")}>
                    <Close fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : undefined,
              sx: {
                borderRadius: 3,
                bgcolor: INBOX_COLORS.surface,
                "& .MuiOutlinedInput-notchedOutline": { borderColor: INBOX_COLORS.border },
              },
            },
          }}
        />

        <Stack
          direction="row"
          role="group"
          aria-label="Filter messages"
          spacing={0.8}
          sx={{ mt: 1.3, overflowX: "auto", pb: 0.3, scrollbarWidth: "none" }}
        >
          {MESSAGE_FILTERS.map((option) => {
            const active = filter === option.id;
            return (
              <Chip
                key={option.id}
                label={option.label}
                size="small"
                clickable
                aria-pressed={active}
                onClick={() => onFilterChange(option.id)}
                sx={{
                  flexShrink: 0,
                  fontWeight: 600,
                  borderRadius: 999,
                  border: `1px solid ${active ? INBOX_COLORS.primary : INBOX_COLORS.border}`,
                  bgcolor: active ? INBOX_COLORS.primary : "#ffffff",
                  color: active ? "#ffffff" : INBOX_COLORS.text,
                  "&:hover": { bgcolor: active ? "#196c9a" : INBOX_COLORS.hover },
                }}
              />
            );
          })}
        </Stack>
      </Box>

      {/* Bulk toolbar */}
      <Stack
        direction="row"
        role="toolbar"
        aria-label="Bulk actions"
        sx={{
          position: "relative",
          alignItems: "center",
          minHeight: 44,
          pl: 0.5,
          pr: 1.5,
          borderTop: `1px solid ${INBOX_COLORS.divider}`,
          borderBottom: `1px solid ${INBOX_COLORS.divider}`,
          bgcolor: checkedCount > 0 ? INBOX_COLORS.selected : "#f2f9ff",
        }}
      >
        <Checkbox
          size="small"
          checked={allChecked}
          indeterminate={checkedCount > 0 && !allChecked}
          onChange={onToggleCheckAll}
          disabled={threads.length === 0 || isLoading}
          slotProps={{ input: { "aria-label": allChecked ? "Deselect all" : "Select all" } }}
          sx={{ color: "#9bb7c9" }}
        />
        {checkedCount > 0 ? (
          <>
            <Typography variant="body2" sx={{ fontWeight: 700, color: INBOX_COLORS.heading, mr: "auto" }}>
              {checkedCount} selected
            </Typography>
            {inTrash
              ? [
                  bulkButton("restore", "Restore", <RestoreFromTrash fontSize="small" />),
                  bulkButton("deleteForever", "Delete forever", <DeleteForeverOutlined fontSize="small" />),
                ]
              : [
                  folder !== "archived" && bulkButton("archive", "Archive", <ArchiveOutlined fontSize="small" />),
                  bulkButton("trash", "Delete", <DeleteOutlined fontSize="small" />),
                  bulkButton("markRead", "Mark as read", <DraftsOutlined fontSize="small" />),
                  bulkButton("markUnread", "Mark as unread", <MarkEmailUnreadOutlined fontSize="small" />),
                ]}
          </>
        ) : (
          <Typography variant="body2" sx={{ color: INBOX_COLORS.muted }} aria-live="polite">
            {isLoading ? "Loading…" : `${total} conversation${total === 1 ? "" : "s"}`}
          </Typography>
        )}
        {isFetching && !isLoading && (
          <LinearProgress
            aria-label="Updating messages"
            sx={{ position: "absolute", left: 0, right: 0, bottom: -1, height: 2 }}
          />
        )}
      </Stack>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>{renderBody()}</Box>
    </Box>
  );
}
