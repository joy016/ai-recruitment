/**
 * Formats a Philippine mobile number as "+639 7099 80679" while the user types.
 *
 * Accepts any of the common ways people enter it — "09709980679",
 * "9709980679", "639709980679" or "+63 970 998 0679" — and keeps at most the
 * 10 digits that follow the +63 country code.
 */
export const formatPhoneNumber = (value?: string | null): string => {
  if (!value) return "";

  let digits = value.replace(/\D/g, "");

  if (digits.startsWith("63")) {
    digits = digits.slice(2);
  } else if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  digits = digits.slice(0, 10);

  if (!digits) return "";

  const first = digits.slice(0, 1);
  const middle = digits.slice(1, 5);
  const last = digits.slice(5);

  return [`+63${first}`, middle, last].filter(Boolean).join(" ");
};

/** True when the value holds all 10 digits after +63, e.g. "+639 7099 80679". */
export const isCompletePhoneNumber = (value?: string | null): boolean =>
  formatPhoneNumber(value).replace(/\D/g, "").length === 12;
