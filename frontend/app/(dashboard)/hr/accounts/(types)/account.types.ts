export type AccountRole = "Admin" | "HR Manager" | "Recruiter" | "Interviewer";

export type AccountStatus = "Active" | "Inactive";

export type Account = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: AccountRole;
  status: AccountStatus;
  createdAt: string;
};

export type AccountFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  role: AccountRole;
};
