"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { fetchPermissions } from "@/lib/store/features/permissionSlice";

// How old loaded permissions may get before returning to the tab refetches them,
// so changes made in Role & Permissions reach users without a redeploy.
const REVALIDATE_AFTER_MS = 60_000;

/**
 * Loads the logged-in user's permissions once per role and keeps them fresh.
 * Mounted once in the HR layout; renders nothing.
 */
export default function PermissionsLoader() {
  const dispatch = useAppDispatch();
  const roleId = useAppSelector((state) => state.user.currentUser?.roleId);
  const {
    roleId: loadedRoleId,
    status,
    lastLoadedAt,
  } = useAppSelector((state) => state.permissions);

  // Load after login, and again whenever the user's role changes.
  useEffect(() => {
    if (roleId === undefined) return;
    if (loadedRoleId === roleId && status !== "idle") return;
    dispatch(fetchPermissions(roleId));
  }, [dispatch, roleId, loadedRoleId, status]);

  // Revalidate when the user comes back to the tab.
  useEffect(() => {
    if (roleId === undefined) return;

    const revalidate = () => {
      if (document.visibilityState !== "visible") return;
      const isStale =
        lastLoadedAt === null || Date.now() - lastLoadedAt > REVALIDATE_AFTER_MS;
      if (isStale) {
        dispatch(fetchPermissions(roleId));
      }
    };

    document.addEventListener("visibilitychange", revalidate);
    window.addEventListener("focus", revalidate);
    return () => {
      document.removeEventListener("visibilitychange", revalidate);
      window.removeEventListener("focus", revalidate);
    };
  }, [dispatch, roleId, lastLoadedAt]);

  return null;
}
