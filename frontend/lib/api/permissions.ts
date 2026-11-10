import BackendServer from "@/constant/server-address";
import { api } from "../api-client";
import {
  Permission,
  PermissionDefinition,
  RolePermissionsResponse,
} from "../types/permission";

const PERMISSIONS_ENDPOINT = `${BackendServer}/api/Permissions`;
const ROLES_ENDPOINT = `${BackendServer}/api/Roles`;

/**
 * Real API: permission rows (a plain array, one row per role + permission).
 * With `roleId`, only that role's permissions; without it, every role's.
 * This is also the source of truth for the logged-in user's access.
 */
export const getAllPermissions = async (
  roleId?: number,
): Promise<Permission[]> => {
  return api.get<Permission[]>(`${PERMISSIONS_ENDPOINT}/getAllPermissions`, {
    params: roleId === undefined ? undefined : { roleId },
  });
};

// ---------------------------------------------------------------------------
// Role & Permissions management screen
// ---------------------------------------------------------------------------

/**
 * Every permission that exists in the system; drives the matrix rows and
 * columns. The backend stores one row per (role, permission), so the same
 * permission name appears once per role with a different permissionId; rows
 * are de-duplicated by name. Assignments are always matched by name.
 */
export const getPermissionCatalog = async (): Promise<PermissionDefinition[]> => {
  const permissions = await getAllPermissions();
  const byName = new Map<string, PermissionDefinition>();
  permissions.forEach(({ permissionId, permissionName, description }) => {
    if (!byName.has(permissionName)) {
      byName.set(permissionName, { permissionId, permissionName, description });
    }
  });
  return [...byName.values()];
};

/** Permissions currently assigned to a role. */
export const getRolePermissions = async (roleId: number): Promise<Permission[]> => {
  return getAllPermissions(roleId);
};

/**
 * Replaces the permissions assigned to a role, by permission name. The list is
 * the complete desired set, not a delta - names left out are removed. Throws
 * on failure (invalid names, role not found, or the last-administrative-access
 * guard); callers should surface `error.response.data.message`.
 */
export const updateRolePermissions = async (
  roleId: number,
  permissionNames: string[],
): Promise<RolePermissionsResponse> => {
  return api.put<RolePermissionsResponse>(
    `${ROLES_ENDPOINT}/${roleId}/permissions`,
    { permissions: permissionNames },
  );
};
