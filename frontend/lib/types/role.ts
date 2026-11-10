export interface CreateRolePayload {
  roleName: string;
  description?: string;
  /** "#RRGGBB" hex, uppercase. */
  chipColor: string;
}
