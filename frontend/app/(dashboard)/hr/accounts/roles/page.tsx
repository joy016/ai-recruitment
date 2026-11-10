"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Snackbar,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { Refresh } from "@mui/icons-material";
import ConfirmationModal from "@/app/component/ConfirmationModal";
import PermissionMatrix from "./(components)/PermissionMatrix";
import CreateRoleDialog from "./(components)/CreateRoleDialog";
import { Role } from "../(types)/account.types";
import { getAllRoles } from "@/lib/api/roles";
import axios from "axios";
import {
  getPermissionCatalog,
  getRolePermissions,
  updateRolePermissions,
} from "@/lib/api/permissions";
import { PermissionDefinition } from "@/lib/types/permission";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { PERMISSIONS } from "@/constant/permissions";
import { useAppSelector } from "@/lib/store/hooks";
import { buildPermissionMatrix } from "@/lib/utils/permissions";
import { getRoleChipStyle } from "@/lib/utils/roleColor";

type Toast = { severity: "success" | "warning"; message: string };

const primaryButtonSx = {
  textTransform: "none",
  borderRadius: 2,
  fontWeight: 700,
  px: 2.2,
  background: "linear-gradient(90deg, #2f90c5 0%, #3bb8a4 100%)",
  "&:hover": {
    background: "linear-gradient(90deg, #287ca8 0%, #32a18f 100%)",
  },
} as const;

// Assignments are tracked by permission name, not permissionId: the backend
// stores one row per (role, permission), so ids differ between roles.
const toNameSet = (names: string[]) => new Set(names);

export default function RolePermissionsPage() {
  const { hasPermission, refreshPermissions } = usePermissions();
  // Viewing needs accounts.view (route guard); changing anything needs accounts.manage.
  const canManage = hasPermission(PERMISSIONS.accounts.manage);
  const currentRoleId = useAppSelector(
    (state) => state.user.currentUser?.roleId,
  );
  const [roles, setRoles] = useState<Role[]>([]);
  const [catalog, setCatalog] = useState<PermissionDefinition[]>([]);
  const [isLoadingSetup, setIsLoadingSetup] = useState(true);
  const [setupError, setSetupError] = useState("");
  const [setupAttempt, setSetupAttempt] = useState(0);

  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [savedNames, setSavedNames] = useState<Set<string>>(new Set());
  const [draftNames, setDraftNames] = useState<Set<string>>(new Set());
  const [isLoadingRole, setIsLoadingRole] = useState(false);
  const [roleError, setRoleError] = useState("");
  const [roleAttempt, setRoleAttempt] = useState(0);

  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [pendingRoleId, setPendingRoleId] = useState<number | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [createRoleOpen, setCreateRoleOpen] = useState(false);

  // Roles and the permission catalog both come from the real API.
  useEffect(() => {
    const loadSetup = async () => {
      setIsLoadingSetup(true);
      setSetupError("");
      try {
        const [rolesData, catalogData] = await Promise.all([
          getAllRoles(),
          getPermissionCatalog(),
        ]);
        setRoles(rolesData ?? []);
        setCatalog(catalogData ?? []);
        setSelectedRoleId(
          (current) => current ?? rolesData?.[0]?.roleId ?? null,
        );
      } catch (error) {
        console.error("Failed to load roles/permissions:", error);
        setSetupError("Unable to load roles and permissions.");
      } finally {
        setIsLoadingSetup(false);
      }
    };

    loadSetup();
  }, [setupAttempt]);

  const selectedRole = roles.find((role) => role.roleId === selectedRoleId);

  useEffect(() => {
    if (!selectedRole) return;

    let cancelled = false;
    const loadRolePermissions = async () => {
      setIsLoadingRole(true);
      setRoleError("");
      try {
        const permissions = await getRolePermissions(selectedRole.roleId);
        if (cancelled) return;
        const names = permissions.map((permission) => permission.permissionName);
        setSavedNames(toNameSet(names));
        setDraftNames(toNameSet(names));
      } catch (error) {
        console.error("Failed to load role permissions:", error);
        if (!cancelled) {
          setRoleError(
            `Unable to load permissions for ${selectedRole.roleName}.`,
          );
        }
      } finally {
        if (!cancelled) setIsLoadingRole(false);
      }
    };

    loadRolePermissions();
    return () => {
      cancelled = true;
    };
  }, [selectedRole, roleAttempt]);

  const matrix = useMemo(() => buildPermissionMatrix(catalog), [catalog]);

  const changedNames = useMemo(() => {
    const changed = new Set<string>();
    draftNames.forEach((name) => !savedNames.has(name) && changed.add(name));
    savedNames.forEach((name) => !draftNames.has(name) && changed.add(name));
    return changed;
  }, [draftNames, savedNames]);

  const hasChanges = changedNames.size > 0;
  const isBusy = isLoadingRole || !!roleError;

  const handleToggle = (permissionName: string) => {
    if (!canManage) return;
    setDraftNames((current) => {
      const next = new Set(current);
      if (next.has(permissionName)) next.delete(permissionName);
      else next.add(permissionName);
      return next;
    });
  };

  const handleToggleModule = (permissionNames: string[], grant: boolean) => {
    if (!canManage) return;
    setDraftNames((current) => {
      const next = new Set(current);
      permissionNames.forEach((name) =>
        grant ? next.add(name) : next.delete(name),
      );
      return next;
    });
  };

  const handleRoleChange = (roleId: number) => {
    if (roleId === selectedRoleId) return;
    if (hasChanges) {
      setPendingRoleId(roleId);
      return;
    }
    setSelectedRoleId(roleId);
  };

  const handleCancel = () => setDraftNames(new Set(savedNames));

  const handleRoleCreated = async (role: Role) => {
    setCreateRoleOpen(false);

    try {
      setRoles(await getAllRoles());
    } catch (error) {
      console.error("Failed to refresh roles:", error);
      setRoles((current) => [...current, role]);
    }

    // Selecting the role loads its permissions, which start out empty.
    setSelectedRoleId(role.roleId);
    setToast({
      severity: "success",
      message: `Role "${role.roleName}" created. You can now assign its permissions.`,
    });
  };

  const handleConfirmSave = async () => {
    if (!selectedRole || !canManage) return;

    try {
      const result = await updateRolePermissions(selectedRole.roleId, [
        ...draftNames,
      ]);
      setSavedNames(new Set(result.permissions));
      setDraftNames(new Set(result.permissions));
      // Editing your own role changes what you can do: reload immediately.
      if (selectedRole.roleId === currentRoleId) {
        refreshPermissions();
      }
      setToast({
        severity: "success",
        message: `Permissions for ${selectedRole.roleName} saved.`,
      });
    } catch (error) {
      console.error("Failed to save role permissions:", error);
      const message =
        (axios.isAxiosError<{ message?: string }>(error) &&
          error.response?.data?.message) ||
        "Unable to save permission changes. Please try again.";
      setToast({ severity: "warning", message });
    }
  };

  const renderBody = () => {
    if (isLoadingSetup) {
      return (
        <Stack spacing={1.2}>
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} variant="rounded" height={44} />
          ))}
        </Stack>
      );
    }

    if (setupError) {
      return (
        <Alert
          severity="error"
          action={
            <Button
              color="inherit"
              size="small"
              startIcon={<Refresh />}
              onClick={() => setSetupAttempt((attempt) => attempt + 1)}
            >
              Retry
            </Button>
          }
        >
          {setupError}
        </Alert>
      );
    }

    if (roles.length === 0) {
      return (
        <Alert severity="info">No roles found. Create a role first.</Alert>
      );
    }

    if (matrix.rows.length === 0) {
      return (
        <Alert severity="info">No permissions are available to assign.</Alert>
      );
    }

    if (roleError) {
      return (
        <Alert
          severity="error"
          action={
            <Button
              color="inherit"
              size="small"
              startIcon={<Refresh />}
              onClick={() => setRoleAttempt((attempt) => attempt + 1)}
            >
              Retry
            </Button>
          }
        >
          {roleError}
        </Alert>
      );
    }

    return (
      <Box sx={{ position: "relative" }}>
        {isLoadingRole && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              zIndex: 1,
              display: "grid",
              placeItems: "center",
              bgcolor: "rgba(255, 255, 255, 0.6)",
              borderRadius: 2.5,
            }}
          >
            <CircularProgress size={28} />
          </Box>
        )}
        {!isLoadingRole && draftNames.size === 0 && !hasChanges && (
          <Alert severity="info" sx={{ mb: 1.5 }}>
            {selectedRole?.roleName} has no permissions assigned yet.
          </Alert>
        )}
        <PermissionMatrix
          matrix={matrix}
          assignedNames={draftNames}
          changedNames={changedNames}
          disabled={isLoadingRole || !canManage}
          onToggle={handleToggle}
          onToggleModule={handleToggleModule}
        />
      </Box>
    );
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 1.5, sm: 2.2, md: 3 },
        borderRadius: 3,
        border: "1px solid #d7e8f5",
        backgroundColor: "#ffffff",
      }}
    >
      <Box
        sx={{
          display: "flex",
          gap: 1.2,
          justifyContent: "space-between",
          flexWrap: "wrap",
          alignItems: { xs: "stretch", sm: "center" },
        }}
      >
        <Box>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              color: "#17456a",
              fontSize: { xs: "1.2rem", sm: "1.5rem" },
            }}
          >
            Role & Permissions
          </Typography>
          <Typography variant="body1" sx={{ mt: 1, color: "#52718c" }}>
            Choose a role to review and manage what it can access in each
            module.
          </Typography>
        </Box>

        {canManage && (
          <Tooltip
            title={
              hasChanges ? "Save or cancel your permission changes first." : ""
            }
          >
            <span>
              <Button
                variant="contained"
                onClick={() => setCreateRoleOpen(true)}
                disabled={isLoadingSetup || !!setupError || hasChanges}
                sx={primaryButtonSx}
              >
                + New Role
              </Button>
            </span>
          </Tooltip>
        )}
      </Box>

      <Box
        sx={{
          mt: 2.5,
          mb: 2,
          display: "flex",
          flexWrap: "wrap",
          gap: 1.5,
          alignItems: { xs: "stretch", sm: "center" },
          justifyContent: "space-between",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 1.2,
            alignItems: "center",
          }}
        >
          <Select
            size="small"
            value={selectedRoleId ?? ""}
            onChange={(event) => handleRoleChange(Number(event.target.value))}
            disabled={isLoadingSetup || roles.length === 0}
            displayEmpty
            sx={{ minWidth: 220, flex: { xs: 1, sm: "none" } }}
            inputProps={{ "aria-label": "Select role" }}
          >
            {roles.map((role) => (
              <MenuItem key={role.roleId} value={role.roleId}>
                <Chip
                  label={role.roleName}
                  size="small"
                  sx={{ fontWeight: 700, ...getRoleChipStyle(role) }}
                />
              </MenuItem>
            ))}
          </Select>

          {selectedRole && !isLoadingSetup && (
            <Chip
              label={`${draftNames.size} of ${catalog.length} permissions assigned`}
              size="small"
              sx={{ fontWeight: 700, color: "#1f80b6", bgcolor: "#e8f4fb" }}
            />
          )}
          {hasChanges && (
            <Chip
              label={`${changedNames.size} unsaved ${changedNames.size === 1 ? "change" : "changes"}`}
              size="small"
              sx={{ fontWeight: 700, color: "#9a5b00", bgcolor: "#fff6e5" }}
            />
          )}
        </Box>

        {canManage && (
          <Stack
            direction="row"
            spacing={1}
            sx={{ justifyContent: "flex-end" }}
          >
            <Button
              variant="text"
              onClick={handleCancel}
              disabled={!hasChanges || isBusy}
              sx={{ textTransform: "none" }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={() => setConfirmSaveOpen(true)}
              disabled={!hasChanges || isBusy}
              sx={primaryButtonSx}
            >
              Save Changes
            </Button>
          </Stack>
        )}
      </Box>

      {selectedRole?.description && (
        <Typography variant="body2" sx={{ color: "#6b879c", mb: 2 }}>
          {selectedRole.description}
        </Typography>
      )}

      {renderBody()}

      <CreateRoleDialog
        open={createRoleOpen}
        existingRoles={roles}
        onClose={() => setCreateRoleOpen(false)}
        onCreated={handleRoleCreated}
      />

      <ConfirmationModal
        open={confirmSaveOpen}
        title="Save permission changes?"
        description={`This will update ${changedNames.size} ${changedNames.size === 1 ? "permission" : "permissions"} for ${selectedRole?.roleName ?? "this role"}. Users with this role will be affected.`}
        confirmLabel="Save Changes"
        onConfirm={handleConfirmSave}
        onClose={() => setConfirmSaveOpen(false)}
      />

      <ConfirmationModal
        open={pendingRoleId !== null}
        title="Discard unsaved changes?"
        description={`You have unsaved changes for ${selectedRole?.roleName ?? "this role"}. Switching roles will discard them.`}
        confirmLabel="Discard & Switch"
        confirmTone="danger"
        onConfirm={() => {
          setDraftNames(new Set(savedNames));
          setSelectedRoleId(pendingRoleId);
        }}
        onClose={() => setPendingRoleId(null)}
      />

      <Snackbar
        open={toast !== null}
        autoHideDuration={4200}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        // Sit above the floating "Chat AI" button in the bottom-right corner.
        sx={{ bottom: { xs: 76, sm: 96 } }}
      >
        <Alert
          severity={toast?.severity ?? "success"}
          variant="filled"
          onClose={() => setToast(null)}
          sx={{ width: "100%" }}
        >
          {toast?.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
}
