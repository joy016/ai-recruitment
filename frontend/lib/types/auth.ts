export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthUser {
  createdAt: string;
  depId: number;
  departmentName: string;
  email: string;
  employeeNumber: string;
  firstName: string;
  id: string;
  insertedBy: string;
  isActive: boolean;
  lastName: string;
  phoneNumber: string;
  profilePictureUrl?: string | null;
  roleId: number;
  roleName: string;
  updatedAt: string | null;
}

export interface LoginResponse {
  token: string;
  expiresAt?: string;
  user: AuthUser;
}
