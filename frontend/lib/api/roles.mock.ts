/**
 * TEMPORARY mock for creating roles, used by lib/api/roles.ts until a
 * create-role endpoint exists. Created roles live in memory only: they are
 * never sent to the server and disappear on page reload.
 * Delete this file once the real API is connected.
 */
import { Role } from "@/app/(dashboard)/hr/accounts/(types)/account.types";
import { CreateRolePayload } from "../types/role";

const MOCK_LATENCY_MS = 500;

const previewRoles: Role[] = [];
// Negative IDs can never collide with real database IDs.
let nextPreviewRoleId = -1;

export const getPreviewRoles = (): Role[] => [...previewRoles];

export const isPreviewRole = (roleId: number) => roleId < 0;

export const mockCreateRole = (
  payload: CreateRolePayload,
  existingRoles: Role[],
): Promise<Role> =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      const name = payload.roleName.trim();
      const duplicate = [...existingRoles, ...previewRoles].some(
        (role) => role.roleName.trim().toLowerCase() === name.toLowerCase(),
      );
      if (duplicate) {
        reject(new Error(`A role named "${name}" already exists.`));
        return;
      }

      // Role details only: no permission records are created.
      const role: Role = {
        roleId: nextPreviewRoleId--,
        roleName: name,
        description: payload.description?.trim() ?? "",
        isActive: true,
        createdAt: new Date().toISOString(),
        userCount: 0,
        permissionCount: 0,
        chipColor: "#1f80b6",
        backgroundColor: "#e8f4fb",
      };
      previewRoles.push(role);
      resolve(role);
    }, MOCK_LATENCY_MS);
  });
