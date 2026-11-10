import BackendServer from "@/constant/server-address";
import { api } from "../api-client";
import { Role } from "@/app/(dashboard)/hr/accounts/(types)/account.types";
import { Interviewer } from "../types/user";
import { CreateRolePayload } from "../types/role";
import { normalizeHexColor } from "../utils/roleColor";

const ROLES_ENDPOINT = `${BackendServer}/api/Roles`;

export const getAllRoles = async (): Promise<Role[]> => {
  return api.get<Role[]>(`${ROLES_ENDPOINT}/getAllRoles`);
};

export const getRole = async (roleId: number): Promise<Role> => {
  return api.get<Role>(`${ROLES_ENDPOINT}/getRole/${roleId}`);
};

/**
 * Creates a role with no permissions; permissions are assigned separately.
 * Returns the freshly created role in the same shape as getAllRoles/getRole
 * (the insertRole response itself isn't DTO-shaped).
 */
export const createRole = async (payload: CreateRolePayload): Promise<Role> => {
  const created = await api.post<{ roleId: number }, CreateRolePayload>(
    `${ROLES_ENDPOINT}/insertRole`,
    { ...payload, chipColor: normalizeHexColor(payload.chipColor) },
  );
  return getRole(created.roleId);
};

export const getInterviwer = async (): Promise<Interviewer[]> => {
  return api.get<Interviewer[]>(`${ROLES_ENDPOINT}/getInterviewer`);
};
