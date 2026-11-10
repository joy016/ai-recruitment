/**
 * Mirrors the backend's Features/Users/PasswordPolicy.cs exactly (length, character
 * classes, wording) so the two never silently drift apart. This is a client-side
 * convenience only - the backend is still the source of truth and re-validates on submit.
 */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export const PASSWORD_REQUIREMENTS =
  "Password must be at least 8 characters and include an uppercase letter, " +
  "a lowercase letter, a number, and a special character.";

const isSpecial = (char: string) => !/[a-zA-Z0-9]/.test(char) && char.trim() !== "";

/** Null when the password satisfies every rule, otherwise the message to show. */
export const validatePassword = (password: string): string | null => {
  if (
    !password ||
    password.length < PASSWORD_MIN_LENGTH ||
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/[0-9]/.test(password) ||
    ![...password].some(isSpecial)
  ) {
    return PASSWORD_REQUIREMENTS;
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Password must not exceed ${PASSWORD_MAX_LENGTH} characters.`;
  }

  return null;
};

export type PasswordStrength = "weak" | "fair" | "strong";

/** A rough client-side hint only - never a substitute for the real policy check above. */
export const getPasswordStrength = (password: string): PasswordStrength | null => {
  if (!password) return null;

  const criteriaMet = [
    password.length >= PASSWORD_MIN_LENGTH,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /[0-9]/.test(password),
    [...password].some(isSpecial),
  ].filter(Boolean).length;

  if (criteriaMet >= 5 && password.length >= 12) return "strong";
  if (criteriaMet >= 4) return "fair";
  return "weak";
};
