"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import { Close, Refresh } from "@mui/icons-material";
import ConfirmationModal from "@/app/component/ConfirmationModal";
import { getActiveSessions, revokeSession } from "@/lib/api/security";
import { ActiveSession } from "@/lib/types/security";
import { formatShortRelativeTime } from "@/lib/utils/date";

type ActiveSessionsModalProps = {
  open: boolean;
  onClose: () => void;
  /** Called instead of the normal refresh when the user revokes their own current session. */
  onCurrentSessionRevoked: () => void;
};

export default function ActiveSessionsModal({
  open,
  onClose,
  onCurrentSessionRevoked,
}: Readonly<ActiveSessionsModalProps>) {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [pendingRevoke, setPendingRevoke] = useState<ActiveSession | null>(null);
  const [reloadAttempt, setReloadAttempt] = useState(0);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const loadSessions = async () => {
      setIsLoading(true);
      setError("");
      try {
        const data = await getActiveSessions();
        if (!cancelled) setSessions(data);
      } catch (fetchError) {
        console.error("Failed to load active sessions:", fetchError);
        if (!cancelled) setError("Unable to load your active sessions.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadSessions();
    return () => {
      cancelled = true;
    };
  }, [open, reloadAttempt]);

  const handleRevoke = async () => {
    if (!pendingRevoke) return;

    await revokeSession(pendingRevoke.sessionId);

    if (pendingRevoke.isCurrent) {
      onCurrentSessionRevoked();
      return;
    }

    setReloadAttempt((attempt) => attempt + 1);
  };

  const renderBody = () => {
    if (isLoading) {
      return (
        <Box sx={{ display: "grid", placeItems: "center", py: 4 }}>
          <CircularProgress size={28} />
        </Box>
      );
    }

    if (error) {
      return (
        <Alert
          severity="error"
          action={
            <Button
              color="inherit"
              size="small"
              startIcon={<Refresh />}
              onClick={() => setReloadAttempt((attempt) => attempt + 1)}
            >
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      );
    }

    if (sessions.length === 0) {
      return <Alert severity="info">No active sessions found.</Alert>;
    }

    return (
      <Stack divider={<Divider />} spacing={0}>
        {sessions.map((session) => (
          <Box
            key={session.sessionId}
            sx={{
              py: 1.4,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1.2,
              flexWrap: "wrap",
            }}
          >
            <Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <Typography sx={{ fontWeight: 600, color: "#264a66" }}>
                  {session.deviceLabel}
                </Typography>
                {session.isCurrent && (
                  <Chip
                    label="This device"
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      color: "#1c8758",
                      bgcolor: "#e8f7ef",
                    }}
                  />
                )}
              </Stack>
              <Typography variant="caption" sx={{ color: "#7d9ab0" }}>
                {session.ipAddress ?? "Unknown IP"} · Last active{" "}
                {formatShortRelativeTime(session.lastActiveAt)}
              </Typography>
            </Box>

            <Button
              variant="outlined"
              color={session.isCurrent ? "inherit" : "error"}
              size="small"
              onClick={() => setPendingRevoke(session)}
              sx={{ textTransform: "none", borderRadius: 2 }}
            >
              Sign out
            </Button>
          </Box>
        ))}
      </Stack>
    );
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="active-sessions-title"
      >
        <DialogTitle
          id="active-sessions-title"
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 1,
          }}
        >
          <Box>
            <Typography sx={{ fontWeight: 700, color: "#17456a" }}>
              Active Sessions
            </Typography>
            <Typography variant="body2" sx={{ color: "#5f7f96", mt: 0.4 }}>
              Devices currently signed in to your account.
            </Typography>
          </Box>
          <IconButton
            aria-label="Close active sessions"
            onClick={onClose}
            size="small"
            sx={{ color: "#5f7f96", mt: -0.5, mr: -0.8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: "16px !important" }}>{renderBody()}</DialogContent>
      </Dialog>

      <ConfirmationModal
        open={pendingRevoke !== null}
        title={
          pendingRevoke?.isCurrent
            ? "Sign out this device?"
            : "Sign out this session?"
        }
        description={
          pendingRevoke?.isCurrent
            ? "This is the device you're using right now. You'll be signed out immediately."
            : `This will sign out "${pendingRevoke?.deviceLabel}". It will need to log in again to continue.`
        }
        confirmLabel="Sign Out"
        confirmTone="danger"
        onConfirm={handleRevoke}
        onClose={() => setPendingRevoke(null)}
      />
    </>
  );
}
