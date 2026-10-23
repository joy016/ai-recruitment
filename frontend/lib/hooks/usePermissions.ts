"use client";

import { useCallback, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { fetchPermissions } from "@/lib/store/features/permissionSlice";

/**
 * Permission checks for the logged-in user. Everything is denied until the
 * user's own role permissions have loaded successfully.
 */
export function usePermissions() {
  const dispatch = useAppDispatch();
  const roleId = useAppSelector((state) => state.user.currentUser?.roleId);
  const { names, roleId: loadedRoleId, status } = useAppSelector(
    (state) => state.permissions,
  );

  // Loaded permissions only count if they belong to the user's current role.
  const isReady =
    roleId !== undefined && status === "succeeded" && loadedRoleId === roleId;
  const isError =
    roleId !== undefined && status === "failed" && loadedRoleId === roleId;
  const isLoading = roleId !== undefined && !isReady && !isError;

  const granted = useMemo(
    () => new Set(isReady ? names : []),
    [isReady, names],
  );

  const hasPermission = useCallback(
    (permission: string) => granted.has(permission),
    [granted],
  );

  const hasAnyPermission = useCallback(
    (permissions: readonly string[]) =>
      permissions.some((permission) => granted.has(permission)),
    [granted],
  );

  const hasAllPermissions = useCallback(
    (permissions: readonly string[]) =>
      permissions.length > 0 &&
      permissions.every((permission) => granted.has(permission)),
    [granted],
  );

  const refreshPermissions = useCallback(() => {
    if (roleId === undefined) return;
    dispatch(fetchPermissions(roleId));
  }, [dispatch, roleId]);

  return {
    permissions: names,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isLoading,
    isReady,
    isError,
    refreshPermissions,
  };
}
