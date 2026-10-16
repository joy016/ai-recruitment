// Mirrors the backend PasswordPolicy (Features/Users/PasswordPolicy.cs) so the
// checklist only turns green for passwords the API will accept structurally.
// The backend additionally rejects common passwords, which can't be checked here.

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export interface PasswordRequirement {
  key: string;
  label: string;
  test: (password: string) => boolean;
}

export const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  {
    key: "length",
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    test: (password) => password.length >= PASSWORD_MIN_LENGTH,
  },
  {
    key: "uppercase",
    label: "At least 1 uppercase letter",
    test: (password) => /\p{Lu}/u.test(password),
  },
  {
    key: "lowercase",
    label: "At least 1 lowercase letter",
    test: (password) => /\p{Ll}/u.test(password),
  },
  {
    key: "number",
    label: "At least 1 number",
    test: (password) => /\p{Nd}/u.test(password),
  },
  {
    // Backend: anything that isn't a letter, digit or whitespace.
    key: "special",
    label: "At least 1 special character (e.g. ! @ # $)",
    test: (password) => /[^\p{L}\p{N}\s]/u.test(password),
  },
];

export const meetsPasswordRequirements = (password: string) =>
  password.trim().length > 0 &&
  password.length <= PASSWORD_MAX_LENGTH &&
  PASSWORD_REQUIREMENTS.every((requirement) => requirement.test(password));
