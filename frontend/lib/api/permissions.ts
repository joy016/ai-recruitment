import BackendServer from "@/constant/server-address";
import { api } from "../api-client";
import {
  Permission,
  PermissionDefinition,
  UpdateRolePermissionsResult,
} from "../types/permission";
import {
  mockGetPermissionCatalog,
  mockGetRolePermissions,
} from "./permissions.mock";

const PERMISSIONS_ENDPOINT = `${BackendServer}/api/Permissions`;

/**
 * Real API: permissions assigned to a role (a plain array, one row per
 * permission). This is the source of truth for the logged-in user's access.
 */
export const getAllPermissions = async (
  roleId: number,
): Promise<Permission[]> => {
  return api.get<Permission[]>(`${PERMISSIONS_ENDPOINT}/getAllPermissions`, {
    params: { roleId },
  });
};

// ---------------------------------------------------------------------------
// Role & Permissions management screen (still mocked; not used for access checks)
// ---------------------------------------------------------------------------

/**
 * The permissions endpoints are not available yet, so these functions are
 * backed by mock data (see permissions.mock.ts). To connect the real API,
 * replace each mock call with an `api` call, following lib/api/user.ts, e.g.
 *
 *   const PERMISSIONS_ENDPOINT = `${BackendServer}/api/Permissions`;
 *   return api.get<Permission[]>(`${PERMISSIONS_ENDPOINT}/getRolePermissions/${roleId}`);
 *
 * then set IS_PERMISSIONS_API_MOCKED to false.
 */
export const IS_PERMISSIONS_API_MOCKED = true;

/** Every permission that exists in the system; drives the matrix columns and rows. */
export const getPermissionCatalog = async (): Promise<PermissionDefinition[]> => {
  return mockGetPermissionCatalog();
};

/** Permissions currently assigned to a role. */
export const getRolePermissions = async (
  roleId: number,
  roleName: string,
): Promise<Permission[]> => {
  return mockGetRolePermissions(roleId, roleName);
};

/**
 * Replaces the permissions assigned to a role.
 *
 * While mocked, no request is sent and nothing is persisted; callers must
 * check `persisted` instead of treating the call as a successful save.
 */
export const updateRolePermissions = async (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _roleId: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _permissionIds: number[],
): Promise<UpdateRolePermissionsResult> => {
  return { persisted: false };
};
