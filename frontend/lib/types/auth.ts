export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  roleId: number;
  roleName: string;
  insertedBy: string;
  depId: number;
  departmentName: string;
  phoneNumber: string;
  photoUrl?: string | null;
}

export interface LoginResponse {
  token: string;
  expiresAt?: string;
  user: AuthUser;
}
