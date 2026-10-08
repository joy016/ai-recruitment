export interface UserPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  insertedBy: string;
  roleId: number;
}

export interface GetUsersPayload {
  status?: boolean;
  roleId?: number;
  pageNumber: number;
  pageSize: number;
}

export interface UserItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
  roleId: number;
  roleName: string;
  insertedBy: string;
}

export interface GetUsersResponse {
  data: UserItem[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export interface EditUserPayload {
  firstName: string;
  lastName: string;
  email: string;
  roleId: number;
}

export interface Interviewer {
  interviewerId: string;
  interviewerName: string;
}
