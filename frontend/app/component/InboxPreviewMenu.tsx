"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Avatar,
  Badge,
  Box,
  Button,
  Divider,
  IconButton,
  List,
  ListItemButton,
  Popover,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { MailOutlined } from "@mui/icons-material";
import { useInboxCounts, useInboxMessages } from "@/lib/hooks/useInbox";
import {
  formatListTime,
  getAvatarColor,
  getInitials,
} from "@/app/(dashboard)/hr/inbox/(utils)/inbox.utils";

const PREVIEW_LIMIT = 4;

/**
 * Header dropdown previewing unread Inbox conversations. Its badge reads the
 * same cached counts as the sidebar and the folder pane. Kept separate from
 * the bell, which shows system notifications.
 */
export default function InboxPreviewMenu() {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);
  const unreadCount = useInboxCounts().data?.totalUnread ?? 0;
  // Only fetched while the menu is open; SSE invalidation keeps it fresh.
  const unreadQuery = useInboxMessages({ folder: "inbox", filter: "unread", sort: "newest" }, open);
  const unread = (unreadQuery.data?.pages[0]?.items ?? []).slice(0, PREVIEW_LIMIT);

  const renderBody = () => {
    if (unreadQuery.isPending) {
      return (
        <Box sx={{ px: 2, py: 1.5 }} aria-busy="true">
          {Array.from({ length: 3 }, (_, index) => (
            <Stack key={index} direction="row" spacing={1.3} sx={{ py: 0.8 }}>
              <Skeleton variant="circular" width={34} height={34} />
              <Box sx={{ flex: 1 }}>
                <Skeleton width="50%" />
                <Skeleton width="85%" />
              </Box>
            </Stack>
          ))}
        </Box>
      );
    }
    if (unreadQuery.isError) {
      return (
        <Stack sx={{ alignItems: "center", py: 3, px: 2 }} spacing={1}>
          <Typography variant="body2" sx={{ color: "#5f7f96", textAlign: "center" }}>
            Couldn&apos;t load messages.
          </Typography>
          <Button size="small" onClick={() => void unreadQuery.refetch()} sx={{ textTransform: "none" }}>
            Retry
          </Button>
        </Stack>
      );
    }
    if (unread.length === 0) {
      return (
        <Typography variant="body2" sx={{ color: "#5f7f96", textAlign: "center", py: 4 }}>
          You&apos;re all caught up.
        </Typography>
      );
    }
    return (
      <List disablePadding>
        {unread.map((thread) => (
          <ListItemButton
            key={thread.threadId}
            component={Link}
            href={`/hr/inbox?thread=${encodeURIComponent(thread.threadId)}`}
            onClick={() => setAnchorEl(null)}
            sx={{ alignItems: "flex-start", gap: 1.3, py: 1.2, borderBottom: "1px solid #eef5fb" }}
          >
            <Avatar
              sx={{
                width: 34,
                height: 34,
                fontSize: "0.8rem",
                fontWeight: 700,
                bgcolor: getAvatarColor(thread.senderEmail),
              }}
            >
              {getInitials(thread.senderName || thread.senderEmail)}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" spacing={1}>
                <Typography noWrap sx={{ flex: 1, fontSize: "0.88rem", fontWeight: 700, color: "#17456a" }}>
                  {thread.senderName || thread.senderEmail}
                </Typography>
                <Typography variant="caption" sx={{ color: "#1f80b6", fontWeight: 600 }}>
                  {formatListTime(thread.lastActivityAt)}
                </Typography>
              </Stack>
              <Typography noWrap sx={{ fontSize: "0.82rem", fontWeight: 600, color: "#264a66" }}>
                {thread.subject || "(no subject)"}
              </Typography>
              <Typography noWrap variant="caption" sx={{ display: "block", color: "#5f7f96" }}>
                {thread.preview}
              </Typography>
            </Box>
          </ListItemButton>
        ))}
      </List>
    );
  };

  return (
    <>
      <Tooltip title="Messages">
        <IconButton
          aria-label={
            unreadCount > 0 ? `Open messages preview, ${unreadCount} unread` : "Open messages preview"
          }
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={(event) => setAnchorEl(event.currentTarget)}
          sx={{
            color: "#1f80b6",
            bgcolor: "#ecf7ff",
            border: "1px solid #d3e8f5",
            "&:hover": { bgcolor: "#e2f1fb" },
          }}
        >
          <Badge color="error" badgeContent={unreadCount} max={99}>
            <MailOutlined />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              width: 360,
              maxWidth: "calc(100vw - 24px)",
              borderRadius: 3,
              border: "1px solid #d7e8f5",
              boxShadow: "0 12px 32px rgba(15, 58, 92, 0.16)",
            },
          },
        }}
      >
        <Stack direction="row" sx={{ alignItems: "center", px: 2, py: 1.5 }}>
          <Typography sx={{ fontWeight: 700, color: "#17456a", flex: 1 }}>New messages</Typography>
          {unreadCount > 0 && (
            <Typography variant="caption" sx={{ fontWeight: 700, color: "#1f80b6" }}>
              {unreadCount} unread
            </Typography>
          )}
        </Stack>
        <Divider sx={{ borderColor: "#e1eef7" }} />

        {renderBody()}

        <Box sx={{ p: 1 }}>
          <Button
            fullWidth
            component={Link}
            href="/hr/inbox"
            onClick={() => setAnchorEl(null)}
            sx={{ textTransform: "none", fontWeight: 700, color: "#1f80b6", borderRadius: 2 }}
          >
            Open Inbox
          </Button>
        </Box>
      </Popover>
    </>
  );
}
