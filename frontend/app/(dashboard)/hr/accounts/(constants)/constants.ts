import { Account, AccountRole } from "../(types)/account.types";

export const ACCOUNT_ROLES: AccountRole[] = [
  "Admin",
  "HR Manager",
  "Recruiter",
  "Interviewer",
];

export const ACCOUNTS_PAGE_SIZE = 5;
export const ACCOUNTS_PAGE_SIZE_OPTIONS = [5, 10, 25];

export const ACCOUNT_STATUS_FILTERS = ["Active", "Inactive", "All"] as const;

export const DEFAULT_ACCOUNT_PASSWORD = "password123";
export const ACCOUNT_EMAIL_DOMAIN = "@company.com.ph";

export const generateAccountEmail = (firstName: string, lastName: string) => {
  const normalize = (value: string) =>
    value.trim().toLowerCase().replace(/\s+/g, "");

  const normalizedFirstName = normalize(firstName);
  const normalizedLastName = normalize(lastName);

  if (!normalizedFirstName || !normalizedLastName) {
    return "";
  }

  return `${normalizedLastName}.${normalizedFirstName}${ACCOUNT_EMAIL_DOMAIN}`;
};

/**
 * Appends an incrementing number (2, 3, ...) to the base email whenever it
 * already exists, e.g. reyes.angela@... -> reyes.angela2@... -> reyes.angela3@...
 */
export const generateUniqueAccountEmail = (
  firstName: string,
  lastName: string,
  existingEmails: string[],
) => {
  const baseEmail = generateAccountEmail(firstName, lastName);
  if (!baseEmail) {
    return "";
  }

  const takenEmails = new Set(
    existingEmails.map((email) => email.trim().toLowerCase()),
  );

  if (!takenEmails.has(baseEmail)) {
    return baseEmail;
  }

  const [localPart, domain] = baseEmail.split("@");
  let suffix = 2;
  let candidateEmail = `${localPart}${suffix}@${domain}`;
  while (takenEmails.has(candidateEmail)) {
    suffix += 1;
    candidateEmail = `${localPart}${suffix}@${domain}`;
  }

  return candidateEmail;
};

export const DUMMY_ACCOUNTS: Account[] = [
  {
    id: "ACC-1001",
    firstName: "Maria",
    lastName: "Santos",
    email: generateAccountEmail("Maria", "Santos"),
    role: "Admin",
    status: "Active",
    createdAt: "2026-01-12T09:30:00.000Z",
  },
  {
    id: "ACC-1002",
    firstName: "Juan",
    lastName: "Dela Cruz",
    email: generateAccountEmail("Juan", "Dela Cruz"),
    role: "HR Manager",
    status: "Active",
    createdAt: "2026-02-03T14:10:00.000Z",
  },
  {
    id: "ACC-1003",
    firstName: "Angela",
    lastName: "Reyes",
    email: generateAccountEmail("Angela", "Reyes"),
    role: "Recruiter",
    status: "Active",
    createdAt: "2026-03-18T08:45:00.000Z",
  },
  {
    id: "ACC-1004",
    firstName: "Mark",
    lastName: "Villanueva",
    email: generateAccountEmail("Mark", "Villanueva"),
    role: "Interviewer",
    status: "Inactive",
    createdAt: "2026-04-22T11:05:00.000Z",
  },
  {
    id: "ACC-1005",
    firstName: "Kristine",
    lastName: "Torres",
    email: generateAccountEmail("Kristine", "Torres"),
    role: "Recruiter",
    status: "Active",
    createdAt: "2026-05-06T16:20:00.000Z",
  },
  {
    id: "ACC-1006",
    firstName: "Paolo",
    lastName: "Ramos",
    email: generateAccountEmail("Paolo", "Ramos"),
    role: "Interviewer",
    status: "Active",
    createdAt: "2026-06-14T10:15:00.000Z",
  },
  {
    id: "ACC-1007",
    firstName: "Angela",
    lastName: "Reyes",
    email: generateUniqueAccountEmail("Angela", "Reyes", [
      generateAccountEmail("Angela", "Reyes"),
    ]),
    role: "Interviewer",
    status: "Active",
    createdAt: "2026-07-02T13:40:00.000Z",
  },
];
