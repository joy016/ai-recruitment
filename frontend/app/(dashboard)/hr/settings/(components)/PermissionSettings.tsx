"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Chip, Skeleton, Typography } from "@mui/material";
import { Refresh } from "@mui/icons-material";
import SettingsSection from "./SettingsSection";
import PermissionGroup from "./PermissionGroup";
import { PermissionGroupData } from "../(types)/settings.types";
import { getMyPermissions } from "@/lib/api/me";
import { MyPermissionsResponse } from "@/lib/types/permission";
import { getActionLabel, groupPermissionNames } from "@/lib/utils/permissions";

const gridSx = {
  display: "grid",
  gap: 2.5,
  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(3, 1fr)" },
} as const;

export default function PermissionSettings() {
  const [myPermissions, setMyPermissions] =
    useState<MyPermissionsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    const loadPermissions = async () => {
      setIsLoading(true);
      setErrorMessage("");
      try {
        setMyPermissions(await getMyPermissions());
      } catch (error) {
        console.error("Failed to load permissions:", error);
        setErrorMessage("Unable to load your permissions.");
      } finally {
        setIsLoading(false);
      }
    };

    loadPermissions();
  }, [loadAttempt]);

  // The API only returns granted permissions, grouped here by module.
  const groups = useMemo<PermissionGroupData[]>(
    () =>
      groupPermissionNames(myPermissions?.permissions ?? []).map((group) => ({
        category: group.label,
        permissions: group.actions.map((action) => ({
          label: getActionLabel(action),
          granted: true,
        })),
      })),
    [myPermissions],
  );

  const permissionCount = myPermissions?.permissions.length ?? 0;

  const renderBody = () => {
    if (isLoading) {
      return (
        <Box sx={gridSx}>
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} variant="rounded" height={110} />
          ))}
        </Box>
      );
    }

    if (errorMessage) {
      return (
        <Alert
          severity="error"
          action={
            <Button
              color="inherit"
              size="small"
              startIcon={<Refresh />}
              onClick={() => setLoadAttempt((attempt) => attempt + 1)}
            >
              Retry
            </Button>
          }
        >
          {errorMessage}
        </Alert>
      );
    }

    if (groups.length === 0) {
      return (
        <Alert severity="info">
          Your role doesn&apos;t have any permissions assigned yet.
        </Alert>
      );
    }

    return (
      <Box sx={gridSx}>
        {groups.map((group) => (
          <PermissionGroup key={group.category} group={group} />
        ))}
      </Box>
    );
  };

  return (
    <SettingsSection
      title="Access & Permissions"
      description="Permissions are controlled by your assigned role and managed under Accounts → Role & Permissions."
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, mb: 2.5 }}>
        <Typography variant="body2" sx={{ color: "#6b879c" }}>
          Current Role
        </Typography>
        {isLoading ? (
          <Skeleton variant="rounded" width={90} height={24} />
        ) : (
          <Chip
            size="small"
            label={myPermissions?.role ?? "—"}
            sx={{ fontWeight: 700, color: "#1f80b6", bgcolor: "#e8f4fb" }}
          />
        )}
        {!isLoading && !errorMessage && (
          <Typography variant="caption" sx={{ color: "#7d9ab0" }}>
            {permissionCount} {permissionCount === 1 ? "permission" : "permissions"}
          </Typography>
        )}
      </Box>

      {renderBody()}

      <Alert severity="info" sx={{ mt: 2.5 }}>
        This is a read-only view. Role and permission management is handled
        under Accounts → Role & Permissions.
      </Alert>
    </SettingsSection>
  );
}
