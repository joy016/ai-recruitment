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
  depId: number;
  departmentName: string;
  profilePictureUrl?: string | null;
  /** True until the user sets their initial password through the invitation link. */
  isPendingActivation: boolean;
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
  depId: number;
}

export interface UpdatePhoneNumberPayload {
  phoneNumber: string;
}

export interface UploadPhotoResponse {
  photoUrl: string;
}

export interface Interviewer {
  interviewerId: string;
  interviewerName: string;
}

/** GET /api/Users/validateInvitation: always 200; isValid says whether the link is usable. */
export interface InvitationValidationResult {
  isValid: boolean;
  message: string;
  email: string | null;
  expiresAt: string | null;
}

/** Body for POST /api/Users/setInvitationPassword (backend SetInitialPasswordDto). */
export interface SetInvitationPasswordPayload {
  token: string;
  newPassword: string;
  confirmPassword?: string;
}

export interface SetInvitationPasswordResponse {
  success: boolean;
  message: string;
}

export interface ResendInvitationResponse {
  statusCode: number;
  statusMessage: string;
  invitationEmailSent: boolean;
}
