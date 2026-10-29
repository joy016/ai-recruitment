"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  Skeleton,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { Close, DoneAll, Refresh } from "@mui/icons-material";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api/notifications";
import { NotificationItem, NotificationType } from "@/lib/types/notification";
import { NOTIFICATION_PAGE_SIZE } from "@/constant/notifications";
import { getNotificationIconProps } from "@/constant/notificationIcons";
import NotificationIcon from "./NotificationIcon";
import { formatShortRelativeTime } from "@/lib/utils/date";
import { onNotificationsRefresh } from "@/lib/utils/notificationRefresh";

type NotificationFilter = "all" | "unread";

type NotificationPanelProps = {
  open: boolean;
  onClose: () => void;
  unreadCount: number;
  /** Optimistic badge update after one item is marked read. */
  onItemRead: () => void;
  /** Optimistic badge update after "Mark all as read". */
  onAllRead: () => void;
  /** Re-sync the badge from the server, e.g. after a failed update. */
  onSyncUnreadCount: () => void;
};

const TITLE_ID = "notifications-panel-title";

// Types that are about a specific candidate. Job post updates have no
// detail route yet, so they only get marked as read.
const CANDIDATE_TYPES = new Set<NotificationType>([
  "NewApplicant",
  "InterviewScheduled",
  "InterviewRescheduled",
  "CandidateStatusChanged",
  "AiScreeningPassed",
  "AiScreeningNeedsReview",
  "AiScreeningFailed",
  "MeetingAccepted",
  "MeetingDeclined",
  "InterviewReminder",
]);

const getNotificationHref = (item: NotificationItem): string | null => {
  if (CANDIDATE_TYPES.has(item.type) && item.candidateId) {
    return `/hr/candidates/profile/${encodeURIComponent(item.candidateId)}`;
  }
  return null;
};

const getLoadErrorMessage = (error: unknown) =>
  axios.isAxiosError(error) && !error.response
    ? "Unable to reach the server. Check your connection and try again."
    : "Unable to load notifications.";

/**
 * Right-hand notifications drawer. MUI's temporary Drawer traps focus, closes
 * on Esc and restores focus to the bell; its content unmounts on close, so
 * every open starts with a fresh fetch.
 */
export default function NotificationPanel({
  open,
  onClose,
  ...listProps
}: Readonly<NotificationPanelProps>) {
  return (
    <Drawer
      anchor="right"
      variant="temporary"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: { role: "dialog", "aria-modal": true, "aria-labelledby": TITLE_ID },
      }}
      sx={{
        "& .MuiDrawer-paper": {
          width: { xs: "100%", sm: 390 },
          borderLeft: "1px solid #d7e8f5",
          bgcolor: "#f8fcff",
        },
      }}
    >
      <NotificationList onClose={onClose} {...listProps} />
    </Drawer>
  );
}

type ListState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; items: NotificationItem[]; totalCount: number; page: number };

function NotificationList({
  onClose,
  unreadCount,
  onItemRead,
  onAllRead,
  onSyncUnreadCount,
}: Readonly<Omit<NotificationPanelProps, "open">>) {
  const router = useRouter();
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [state, setState] = useState<ListState>({ status: "loading" });
  const [requestKey, setRequestKey] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getNotifications({
      page: 1,
      pageSize: NOTIFICATION_PAGE_SIZE,
      unreadOnly: filter === "unread",
    })
      .then(({ items, totalCount }) => {
        if (!cancelled) setState({ status: "ready", items, totalCount, page: 1 });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({ status: "error", message: getLoadErrorMessage(error) });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [filter, requestKey]);

  // While open, the shared refresh event also refetches page 1 quietly (no
  // skeleton) and merges it in front of what's already loaded.
  const silentRequestIdRef = useRef(0);
  useEffect(
    () =>
      onNotificationsRefresh(() => {
        const requestId = ++silentRequestIdRef.current;
        getNotifications({
          page: 1,
          pageSize: NOTIFICATION_PAGE_SIZE,
          unreadOnly: filter === "unread",
        })
          .then(({ items, totalCount }) => {
            if (requestId !== silentRequestIdRef.current) return; // stale
            setState((current) => {
              if (current.status !== "ready") return current;
              const fresh = new Set(items.map((item) => item.id));
              return {
                ...current,
                items: [...items, ...current.items.filter((item) => !fresh.has(item.id))],
                totalCount,
              };
            });
          })
          .catch(() => {
            // Background refresh: keep showing the current list.
          });
      }),
    [filter],
  );

  const reload = () => {
    setState({ status: "loading" });
    setActionError(null);
    setRequestKey((key) => key + 1);
  };

  const handleFilterChange = (next: NotificationFilter | null) => {
    if (!next || next === filter) return;
    setState({ status: "loading" });
    setFilter(next);
  };

  const setReadFlags = (isRead: (item: NotificationItem) => boolean) =>
    setState((current) =>
      current.status === "ready"
        ? {
            ...current,
            items: current.items.map((item) => ({ ...item, isRead: isRead(item) })),
          }
        : current,
    );

  const handleLoadMore = async () => {
    if (state.status !== "ready") return;
    setIsLoadingMore(true);
    setActionError(null);
    try {
      const nextPage = state.page + 1;
      const { items, totalCount } = await getNotifications({
        page: nextPage,
        pageSize: NOTIFICATION_PAGE_SIZE,
        unreadOnly: filter === "unread",
      });
      setState((current) => {
        if (current.status !== "ready") return current;
        // New notifications shift pages; skip anything already shown.
        const seen = new Set(current.items.map((item) => item.id));
        return {
          status: "ready",
          items: [...current.items, ...items.filter((item) => !seen.has(item.id))],
          totalCount,
          page: nextPage,
        };
      });
    } catch (error) {
      setActionError(
        axios.isAxiosError(error) && !error.response
          ? "Unable to reach the server. Check your connection and try again."
          : "Unable to load more notifications.",
      );
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleItemClick = (item: NotificationItem) => {
    if (!item.isRead) {
      setReadFlags((current) => current.isRead || current.id === item.id);
      onItemRead();
      markNotificationRead(item.id).catch(() => {
        setReadFlags((current) => (current.id === item.id ? false : current.isRead));
        onSyncUnreadCount();
        setActionError("Couldn't mark the notification as read.");
      });
    }

    const href = getNotificationHref(item);
    if (href) {
      onClose();
      router.push(href);
    }
  };

  const handleMarkAllRead = async () => {
    if (state.status !== "ready") return;
    const previouslyUnread = new Set(
      state.items.filter((item) => !item.isRead).map((item) => item.id),
    );
    setReadFlags(() => true);
    onAllRead();
    setActionError(null);
    try {
      await markAllNotificationsRead();
    } catch {
      setReadFlags((item) => !previouslyUnread.has(item.id));
      onSyncUnreadCount();
      setActionError("Couldn't mark all notifications as read.");
    }
  };

  const hasUnread =
    unreadCount > 0 ||
    (state.status === "ready" && state.items.some((item) => !item.isRead));

  return (
    <>
      <Box sx={{ p: 2.2 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 1,
          }}
        >
          <Typography
            id={TITLE_ID}
            variant="h6"
            sx={{ fontWeight: 700, color: "#17456a" }}
          >
            Notifications
          </Typography>
          <IconButton
            aria-label="Close notifications"
            onClick={onClose}
            size="small"
            sx={{ color: "#5f7f96", mt: -0.5, mr: -0.8 }}
          >
            <Close />
          </IconButton>
        </Box>
        <Typography variant="body2" sx={{ color: "#5f7f96", mt: 0.4 }}>
          Track screening outcomes, interview updates, and candidate actions.
        </Typography>

        <Box
          sx={{
            mt: 1.6,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          <ToggleButtonGroup
            size="small"
            exclusive
            value={filter}
            onChange={(_, next: NotificationFilter | null) => handleFilterChange(next)}
            aria-label="Filter notifications"
            sx={{ "& .MuiToggleButton-root": { textTransform: "none", px: 1.6 } }}
          >
            <ToggleButton value="all">All</ToggleButton>
            <ToggleButton value="unread">Unread</ToggleButton>
          </ToggleButtonGroup>
          <Button
            size="small"
            startIcon={<DoneAll />}
            onClick={handleMarkAllRead}
            disabled={!hasUnread || state.status !== "ready"}
            sx={{ textTransform: "none", fontWeight: 600, color: "#1f80b6" }}
          >
            Mark all as read
          </Button>
        </Box>
      </Box>
      <Divider />

      {actionError && (
        <Alert
          severity="warning"
          onClose={() => setActionError(null)}
          sx={{ mx: 1.2, mt: 1.2 }}
        >
          {actionError}
        </Alert>
      )}

      {state.status === "loading" && (
        <Box sx={{ px: 1.2, py: 1.2 }} aria-busy="true" aria-label="Loading notifications">
          {[0, 1, 2].map((key) => (
            <Box
              key={key}
              sx={{
                mb: 1,
                p: 1.2,
                borderRadius: 2,
                border: "1px solid #dcecf8",
                bgcolor: "#ffffff",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Skeleton variant="circular" width={30} height={30} />
                <Skeleton variant="text" sx={{ flex: 1 }} />
              </Box>
              <Skeleton variant="text" sx={{ mt: 0.9 }} />
              <Skeleton variant="text" width="30%" />
            </Box>
          ))}
        </Box>
      )}

      {state.status === "error" && (
        <Box sx={{ p: 3, textAlign: "center" }}>
          <Typography variant="body2" sx={{ color: "#52718c" }}>
            {state.message}
          </Typography>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={reload}
            sx={{ mt: 1.6, textTransform: "none", borderRadius: 2 }}
          >
            Try Again
          </Button>
        </Box>
      )}

      {state.status === "ready" && state.items.length === 0 && (
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography sx={{ fontWeight: 700, color: "#274d68" }}>
            {filter === "unread" ? "No unread notifications" : "No notifications yet"}
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.6, color: "#7893a8" }}>
            {filter === "unread"
              ? "You're all caught up."
              : "Updates about candidates and interviews will appear here."}
          </Typography>
        </Box>
      )}

      {state.status === "ready" && state.items.length > 0 && (
        <List sx={{ px: 1.2, py: 1.2 }}>
          {state.items.map((item) => {
            return (
              <ListItem key={item.id} disablePadding sx={{ mb: 1 }}>
                <ListItemButton
                  onClick={() => handleItemClick(item)}
                  aria-label={`${item.isRead ? "" : "Unread: "}${item.title}`}
                  sx={{
                    display: "block",
                    width: "100%",
                    p: 1.2,
                    borderRadius: 2,
                    border: "1px solid #dcecf8",
                    bgcolor: "#ffffff",
                    "&:hover": { bgcolor: "#f4faff" },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <NotificationIcon {...getNotificationIconProps(item)} />

                    <Typography sx={{ fontWeight: 700, color: "#274d68", flex: 1 }}>
                      {item.title}
                    </Typography>

                    {item.isRead ? null : (
                      <Chip
                        label="New"
                        size="small"
                        sx={{ bgcolor: "#e9f5ff", color: "#1f80b6", fontWeight: 700 }}
                      />
                    )}
                  </Box>

                  <Typography variant="body2" sx={{ mt: 0.9, color: "#4f7189" }}>
                    {item.message}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ mt: 0.7, color: "#7893a8", display: "block" }}
                  >
                    {formatShortRelativeTime(item.createdAt)}
                  </Typography>
                </ListItemButton>
              </ListItem>
            );
          })}

          {state.items.length < state.totalCount && (
            <Box sx={{ display: "flex", justifyContent: "center", pt: 0.5 }}>
              <Button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                startIcon={
                  isLoadingMore ? <CircularProgress size={14} color="inherit" /> : undefined
                }
                sx={{ textTransform: "none", fontWeight: 600, color: "#1f80b6" }}
              >
                {isLoadingMore ? "Loading..." : "Load more"}
              </Button>
            </Box>
          )}
        </List>
      )}
    </>
  );
}
