import BackendServer from "@/constant/server-address";
import { api } from "../api-client";
import { Role } from "@/app/(dashboard)/hr/accounts/(types)/account.types";
import { Interviewer } from "../types/user";
import { CreateRolePayload } from "../types/role";
import { getPreviewRoles, mockCreateRole } from "./roles.mock";

const ROLES_ENDPOINT = `${BackendServer}/api/Roles`;

/**
 * There is no create-role endpoint yet, so createRole is mocked (see
 * roles.mock.ts). To connect the real API, replace the mock call with e.g.
 * `api.post<Role, CreateRolePayload>(`${ROLES_ENDPOINT}/insertRole`, payload)`,
 * drop the preview roles from getRolesWithPreview, and set this to false.
 */
export const IS_CREATE_ROLE_API_MOCKED = true;

export const getAllRoles = async (): Promise<Role[]> => {
  return api.get<Role[]>(`${ROLES_ENDPOINT}/getAllRoles`);
};

/** Real roles plus any roles created in preview mode this session. */
export const getRolesWithPreview = async (): Promise<Role[]> => {
  const roles = (await getAllRoles()) ?? [];
  return IS_CREATE_ROLE_API_MOCKED ? [...roles, ...getPreviewRoles()] : roles;
};

/** Creates a role with no permissions; permissions are assigned separately. */
export const createRole = async (
  payload: CreateRolePayload,
  existingRoles: Role[],
): Promise<Role> => {
  return mockCreateRole(payload, existingRoles);
};

export const getInterviwer = async (): Promise<Interviewer[]> => {
  return api.get<Interviewer[]>(`${ROLES_ENDPOINT}/getInterviewer`);
};
