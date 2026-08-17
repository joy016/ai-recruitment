export type ApplicantStatus =
  | "AI Screening passed"
  | "Initial Interview"
  | "Technical Interview"
  | "Final Interview"
  | "Job Offer"
  | "Requirements Gathering"
  | "Background Check"
  | "Onboarding"
  | "Offered"
  | "Rejected";

export interface Candidate {
  id: string;
  emailAddress: string;
  firstName: string;
  lastName: string;
  applicationDate: string;
  yearsOfExperience: string;
  interviewSched: string | null;
  applicantStatusId: number;
  resumePath: string;
}
