export interface CreateCandidatePayload {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  yearsOfExperience: number;
  linkedInUrl?: string;
  portfolioUrl?: string;
  coverLetter?: string;
  resume: File;
  role?: string;
  sourceOfApplication?: string;
  JobId: number;
}

/** GET /api/Candidates/{id}/resume-url — a short-lived signed URL; never cache it. */
export interface ResumeUrlResponse {
  url: string;
  expiresAt: string;
  fileName: string | null;
  contentType: string;
}

export interface UpdateStatusPayload {
  id: string;
  applicantStatusId: number;
  interviewSched: string;
  interviewerId?: string;
  updatedAt: string;
}
