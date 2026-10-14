/**
 * TEMPORARY mock data for the Role & Permissions preview.
 *
 * Used by lib/api/permissions.ts until the permissions endpoints exist.
 * Delete this file once the real API is connected.
 */
import { Permission, PermissionDefinition } from "../types/permission";

const MOCK_CREATED_AT = "2026-10-14T00:00:00Z";
const MOCK_LATENCY_MS = 400;

export const MOCK_PERMISSION_CATALOG: PermissionDefinition[] = [
  { permissionId: 1, permissionName: "dashboard.view", description: null },
  { permissionId: 10, permissionName: "jobs.view", description: null },
  { permissionId: 11, permissionName: "jobs.create", description: null },
  { permissionId: 12, permissionName: "jobs.update", description: null },
  { permissionId: 13, permissionName: "jobs.delete", description: null },
  { permissionId: 16, permissionName: "candidates.view", description: null },
  { permissionId: 17, permissionName: "candidates.create", description: null },
  { permissionId: 18, permissionName: "candidates.update", description: null },
  { permissionId: 19, permissionName: "candidates.delete", description: null },
  { permissionId: 22, permissionName: "users.view", description: null },
  { permissionId: 23, permissionName: "users.create", description: null },
  { permissionId: 24, permissionName: "users.update", description: null },
  { permissionId: 25, permissionName: "users.delete", description: null },
  { permissionId: 28, permissionName: "notifications.view", description: null },
  { permissionId: 29, permissionName: "notifications.update", description: null },
  { permissionId: 30, permissionName: "notifications.delete", description: null },
  { permissionId: 33, permissionName: "settings.view", description: null },
  { permissionId: 34, permissionName: "settings.update", description: null },
];

const ALL = MOCK_PERMISSION_CATALOG.map((p) => p.permissionName);

/** Mock assignments, keyed by lower-cased role name. */
const MOCK_ROLE_ASSIGNMENTS: Record<string, string[]> = {
  "super admin": ALL,
  "hr admin": ALL.filter((name) => name !== "users.delete"),
  recruiter: [
    "dashboard.view",
    "candidates.view",
    "candidates.create",
    "candidates.update",
    "candidates.delete",
    "jobs.view",
    "jobs.create",
    "jobs.update",
    "notifications.view",
    "notifications.update",
    "settings.view",
  ],
  "hiring manager": [
    "dashboard.view",
    "candidates.view",
    "candidates.update",
    "jobs.view",
    "notifications.view",
    "settings.view",
  ],
  interviewer: [
    "dashboard.view",
    "candidates.view",
    "notifications.view",
    "settings.view",
  ],
};

const delay = <T>(value: T) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(value), MOCK_LATENCY_MS));

export const mockGetPermissionCatalog = () => delay(MOCK_PERMISSION_CATALOG);

export const mockGetRolePermissions = (
  roleId: number,
  roleName: string,
): Promise<Permission[]> => {
  // Roles without mock assignments (e.g. newly created ones) have none.
  const assigned = MOCK_ROLE_ASSIGNMENTS[roleName.trim().toLowerCase()] ?? [];

  return delay(
    MOCK_PERMISSION_CATALOG.filter((p) =>
      assigned.includes(p.permissionName),
    ).map((p) => ({
      ...p,
      createdAt: MOCK_CREATED_AT,
      roleId,
      roleName,
    })),
  );
};
