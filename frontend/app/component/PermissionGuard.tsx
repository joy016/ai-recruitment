"use client";

import { Box, Button, CircularProgress, Paper, Typography } from "@mui/material";
import { LockOutlined, Refresh } from "@mui/icons-material";
import { usePermissions } from "@/lib/hooks/usePermissions";
import LinkButton from "./LinkButton";

type PermissionGuardProps = {
  /** Required permission. */
  permission?: string;
  /** Allowed if the user has at least one of these. */
  anyOf?: readonly string[];
  /** Allowed only if the user has all of these. */
  allOf?: readonly string[];
  children: React.ReactNode;
};

const panelSx = {
  p: { xs: 3, sm: 5 },
  borderRadius: 3,
  border: "1px solid #d7e8f5",
  backgroundColor: "#ffffff",
  textAlign: "center",
} as const;

/**
 * Page-level protection. Renders children only once the user's permissions
 * have loaded and allow it; otherwise a loader, an error, or 403.
 * Unauthenticated users are handled earlier by proxy.ts and SessionGuard.
 */
export default function PermissionGuard({
  permission,
  anyOf,
  allOf,
  children,
}: Readonly<PermissionGuardProps>) {
  const {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isLoading,
    isError,
    refreshPermissions,
  } = usePermissions();

  if (isLoading) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", py: 10 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (isError) {
    return (
      <Paper elevation={0} sx={panelSx}>
        <Typography sx={{ fontWeight: 700, color: "#17456a" }}>
          Unable to load your permissions
        </Typography>
        <Typography variant="body2" sx={{ mt: 1, color: "#52718c" }}>
          Access is restricted until your permissions can be verified.
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={refreshPermissions}
          sx={{ mt: 2.5, textTransform: "none", borderRadius: 2 }}
        >
          Try Again
        </Button>
      </Paper>
    );
  }

  // Deny by default: with no requirement given, nothing is granted.
  const allowed =
    (permission === undefined || hasPermission(permission)) &&
    (anyOf === undefined || hasAnyPermission(anyOf)) &&
    (allOf === undefined || hasAllPermissions(allOf)) &&
    (permission !== undefined || anyOf !== undefined || allOf !== undefined);

  if (!allowed) {
    return (
      <Paper elevation={0} sx={panelSx}>
        <Box
          sx={{
            mx: "auto",
            mb: 2,
            width: 64,
            height: 64,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            bgcolor: "#fdecec",
          }}
        >
          <LockOutlined sx={{ fontSize: 30, color: "#d64545" }} />
        </Box>
        <Typography
          variant="overline"
          sx={{ color: "#d64545", fontWeight: 700, letterSpacing: "0.1em" }}
        >
          403
        </Typography>
        <Typography
          sx={{ fontWeight: 700, color: "#17456a", fontSize: "1.25rem" }}
        >
          Access Denied
        </Typography>
        <Typography variant="body2" sx={{ mt: 1, color: "#52718c" }}>
          You don&apos;t have permission to view this page. Contact your
          administrator if you think this is a mistake.
        </Typography>
        <LinkButton
          href="/hr/settings"
          variant="outlined"
          sx={{ mt: 2.5, textTransform: "none", borderRadius: 2 }}
        >
          Go to Settings
        </LinkButton>
      </Paper>
    );
  }

  return <>{children}</>;
}
