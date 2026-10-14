/** A permission assigned to a role, as returned by the backend. */
export interface Permission {
  permissionId: number;
  permissionName: string;
  description: string | null;
  createdAt: string;
  roleId: number;
  roleName: string;
}

/** A permission that exists in the system, regardless of role. */
export interface PermissionDefinition {
  permissionId: number;
  permissionName: string;
  description: string | null;
}

/** GET /api/me/permissions: the logged-in user's role and granted permissions. */
export interface MyPermissionsResponse {
  role: string;
  permissions: string[];
}

export interface UpdateRolePermissionsPayload {
  permissionIds: number[];
}

export interface UpdateRolePermissionsResult {
  /** False while the permissions API is mocked: nothing reached the server. */
  persisted: boolean;
}
