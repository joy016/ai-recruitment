type DateInput = string | null | undefined;

const RELATIVE_TIME_UNITS: { unit: Intl.RelativeTimeFormatUnit; ms: number }[] =
  [
    { unit: "year", ms: 365 * 24 * 60 * 60 * 1000 },
    { unit: "month", ms: 30 * 24 * 60 * 60 * 1000 },
    { unit: "week", ms: 7 * 24 * 60 * 60 * 1000 },
    { unit: "day", ms: 24 * 60 * 60 * 1000 },
    { unit: "hour", ms: 60 * 60 * 1000 },
    { unit: "minute", ms: 60 * 1000 },
  ];

const EMPTY_PLACEHOLDER = "-";

const relativeTimeFormatter = new Intl.RelativeTimeFormat("en", {
  numeric: "auto",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const dateOnlyFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC", // keeps date-only values (midnight UTC) from shifting a day
});

/**
 * Shared guard: returns the parsed Date, or a string to return early
 * (placeholder for empty input, raw value for unparseable input).
 */
const parseOrFallback = (value: DateInput): Date | string => {
  if (!value) return EMPTY_PLACEHOLDER;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed;
};

/** "2 days ago", "yesterday", "5 minutes ago", "just now" */
export const formatRelativeTime = (value: DateInput): string => {
  const parsed = parseOrFallback(value);
  if (typeof parsed === "string") return parsed;

  const diffMs = parsed.getTime() - Date.now();
  const absDiffMs = Math.abs(diffMs);

  for (const { unit, ms } of RELATIVE_TIME_UNITS) {
    if (absDiffMs >= ms) {
      return relativeTimeFormatter.format(Math.round(diffMs / ms), unit);
    }
  }

  return "just now";
};

/** "June 21, 2026, 8:05 AM" */
export const formatDateTime = (value: DateInput): string => {
  const parsed = parseOrFallback(value);
  return typeof parsed === "string" ? parsed : dateTimeFormatter.format(parsed);
};

/** "June 21, 2026" */
export const formatDateOnly = (value: DateInput): string => {
  const parsed = parseOrFallback(value);
  return typeof parsed === "string" ? parsed : dateOnlyFormatter.format(parsed);
};
