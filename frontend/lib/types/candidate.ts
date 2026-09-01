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

export interface UpdateStatusPayload {
  id: string;
  applicantStatusId: number;
  interviewSched: string;
  updatedAt: string;
}
