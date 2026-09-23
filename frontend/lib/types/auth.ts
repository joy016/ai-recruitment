export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export interface LoginResponse {
  token: string;
  expiresAt?: string;
  user: AuthUser;
}
