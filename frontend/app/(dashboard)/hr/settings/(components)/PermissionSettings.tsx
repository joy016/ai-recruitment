"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Chip, Skeleton, Typography } from "@mui/material";
import SettingsSection from "./SettingsSection";
import PermissionGroup from "./PermissionGroup";
import { PermissionGroupData } from "../(types)/settings.types";
import { useAppSelector } from "@/lib/store/hooks";
import {
  IS_PERMISSIONS_API_MOCKED,
  getPermissionCatalog,
  getRolePermissions,
} from "@/lib/api/permissions";
import { PermissionDefinition } from "@/lib/types/permission";
import { buildPermissionMatrix, getActionLabel } from "@/lib/utils/permissions";

export default function PermissionSettings() {
  const currentUser = useAppSelector((state) => state.user.currentUser);
  const [catalog, setCatalog] = useState<PermissionDefinition[]>([]);
  const [assignedIds, setAssignedIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const roleId = currentUser?.roleId;
  const roleName = currentUser?.roleName;

  useEffect(() => {
    if (roleId === undefined || !roleName) return;

    const loadPermissions = async () => {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const [catalogData, rolePermissions] = await Promise.all([
          getPermissionCatalog(),
          getRolePermissions(roleId, roleName),
        ]);
        setCatalog(catalogData);
        setAssignedIds(new Set(rolePermissions.map((p) => p.permissionId)));
      } catch (error) {
        console.error("Failed to load permissions:", error);
        setErrorMessage("Unable to load your permissions.");
      } finally {
        setIsLoading(false);
      }
    };

    loadPermissions();
  }, [roleId, roleName]);

  // Same module/action grouping as Accounts → Role & Permissions, read-only.
  const groups = useMemo<PermissionGroupData[]>(
    () =>
      buildPermissionMatrix(catalog).rows.map((row) => ({
        category: row.label,
        permissions: Object.entries(row.cells)
          .filter(([, permission]) => permission !== undefined)
          .map(([action, permission]) => ({
            label: getActionLabel(action),
            granted: assignedIds.has(permission!.permissionId),
          })),
      })),
    [catalog, assignedIds],
  );

  const renderBody = () => {
    if (!currentUser) {
      return <Alert severity="info">Sign in to view your permissions.</Alert>;
    }

    if (isLoading) {
      return (
        <Box
          sx={{
            display: "grid",
            gap: 2.5,
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(3, 1fr)" },
          }}
        >
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} variant="rounded" height={110} />
          ))}
        </Box>
      );
    }

    if (errorMessage) {
      return <Alert severity="error">{errorMessage}</Alert>;
    }

    if (groups.length === 0) {
      return <Alert severity="info">No permissions are defined yet.</Alert>;
    }

    return (
      <Box
        sx={{
          display: "grid",
          gap: 2.5,
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(3, 1fr)" },
        }}
      >
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
        <Chip
          size="small"
          label={roleName ?? "—"}
          sx={{ fontWeight: 700, color: "#1f80b6", bgcolor: "#e8f4fb" }}
        />
        {!isLoading && currentUser && !errorMessage && (
          <Typography variant="caption" sx={{ color: "#7d9ab0" }}>
            {assignedIds.size} of {catalog.length} permissions
          </Typography>
        )}
      </Box>

      {renderBody()}

      <Alert severity="info" sx={{ mt: 2.5 }}>
        This is a read-only view. Role and permission management is handled
        under Accounts → Role & Permissions.
        {IS_PERMISSIONS_API_MOCKED && " Permissions shown are sample data for now."}
      </Alert>
    </SettingsSection>
  );
}
