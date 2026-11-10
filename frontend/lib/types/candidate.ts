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

/**
 * PUT /api/Candidates/updateCandidateStatus. Only the schedule and assignee
 * for the target status are sent: interview steps use interviewSched and
 * interviewerId; Job Offer and Onboarding use their own sched/facilitator.
 */
export interface UpdateStatusPayload {
  id: string;
  applicantStatusId: number;
  /** null when the target status has no schedule. */
  interviewSched?: string | null;
  interviewerId?: string;
  jobOfferSched?: string | null;
  jobOfferFacilitatorId?: string;
  onboardingSched?: string | null;
  onboardingFacilitatorId?: string;
  updatedAt: string;
}
