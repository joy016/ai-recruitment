import {
  Box,
  Button,
  Checkbox,
  Chip,
  IconButton,
  InputAdornment,
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
  DeleteOutlined,
  DraftsOutlined,
  MenuOpen,
  Search,
} from "@mui/icons-material";
import {
  INBOX_COLORS,
  MESSAGE_FILTERS,
  MESSAGE_SORTS,
} from "../(constants)/inbox.constants";
import type {
  InboxThread,
  MessageFilter,
  MessageSort,
} from "../(types)/inbox.types";
import InboxEmptyState from "./InboxEmptyState";
import { MessageListSkeleton } from "./InboxSkeletons";
import MessageListItem from "./MessageListItem";

type MessageListProps = {
  title: string;
  threads: InboxThread[];
  isLoading: boolean;
  selectedThreadId: string | null;
  checkedIds: Set<string>;
  showRecipient: boolean;
  search: string;
  filter: MessageFilter;
  sort: MessageSort;
  onSearchChange: (value: string) => void;
  onFilterChange: (filter: MessageFilter) => void;
  onSortChange: (sort: MessageSort) => void;
  onOpenThread: (threadId: string) => void;
  onToggleCheck: (threadId: string) => void;
  onToggleCheckAll: () => void;
  onToggleStar: (threadId: string) => void;
  onBulkArchive: () => void;
  onBulkDelete: () => void;
  onBulkMarkRead: () => void;
  /** Mobile only: opens the folder drawer. */
  onOpenFolders?: () => void;
};

export default function MessageList({
  title,
  threads,
  isLoading,
  selectedThreadId,
  checkedIds,
  showRecipient,
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
  onBulkArchive,
  onBulkDelete,
  onBulkMarkRead,
  onOpenFolders,
}: Readonly<MessageListProps>) {
  const checkedCount = threads.filter((thread) => checkedIds.has(thread.id)).length;
  const allChecked = threads.length > 0 && checkedCount === threads.length;
  const isFiltered = search.trim() !== "" || filter !== "all";

  const renderBody = () => {
    if (isLoading) return <MessageListSkeleton />;

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
          description="You're all caught up. New messages will show up here."
        />
      );
    }

    return (
      <Box component="ul" aria-label={`${title} messages`} sx={{ m: 0, p: 0, listStyle: "none" }}>
        {threads.map((thread) => (
          <MessageListItem
            key={thread.id}
            thread={thread}
            selected={thread.id === selectedThreadId}
            checked={checkedIds.has(thread.id)}
            showRecipient={showRecipient}
            onOpen={onOpenThread}
            onToggleCheck={onToggleCheck}
            onToggleStar={onToggleStar}
          />
        ))}
      </Box>
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
            <Tooltip title="Archive">
              <IconButton size="small" aria-label="Archive selected" onClick={onBulkArchive} sx={{ color: INBOX_COLORS.primary }}>
                <ArchiveOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton size="small" aria-label="Delete selected" onClick={onBulkDelete} sx={{ color: INBOX_COLORS.primary }}>
                <DeleteOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Mark as read">
              <IconButton size="small" aria-label="Mark selected as read" onClick={onBulkMarkRead} sx={{ color: INBOX_COLORS.primary }}>
                <DraftsOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        ) : (
          <Typography variant="body2" sx={{ color: INBOX_COLORS.muted }}>
            {isLoading ? "Loading…" : `${threads.length} conversation${threads.length === 1 ? "" : "s"}`}
          </Typography>
        )}
      </Stack>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>{renderBody()}</Box>
    </Box>
  );
}
