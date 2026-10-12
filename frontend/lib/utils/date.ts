const RELATIVE_TIME_UNITS: { unit: Intl.RelativeTimeFormatUnit; ms: number }[] =
  [
    { unit: "year", ms: 365 * 24 * 60 * 60 * 1000 },
    { unit: "month", ms: 30 * 24 * 60 * 60 * 1000 },
    { unit: "week", ms: 7 * 24 * 60 * 60 * 1000 },
    { unit: "day", ms: 24 * 60 * 60 * 1000 },
    { unit: "hour", ms: 60 * 60 * 1000 },
    { unit: "minute", ms: 60 * 1000 },
  ];

const relativeTimeFormatter = new Intl.RelativeTimeFormat("en", {
  numeric: "auto",
});

/**
 * Formats an ISO date string as a relative time, e.g. "2 days ago",
 * "yesterday", "5 minutes ago". Falls back to the raw value if it can't
 * be parsed, and to "just now" for anything under a minute old.
 */
export const formatRelativeTime = (value: string): string => {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  const diffMs = parsedDate.getTime() - Date.now();
  const absDiffMs = Math.abs(diffMs);

  if (absDiffMs < 60 * 1000) {
    return "just now";
  }

  for (const { unit, ms } of RELATIVE_TIME_UNITS) {
    if (absDiffMs >= ms) {
      return relativeTimeFormatter.format(Math.round(diffMs / ms), unit);
    }
  }

  return "just now";
};

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/**
 * Formats an ISO date string as "June 21, 2026, 8:05 AM". Falls back to the
 * raw value if it can't be parsed.
 */
export const formatDateTime = (value: string): string => {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return dateTimeFormatter.format(parsedDate);
};

const dateOnlyFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

/**
 * Formats an ISO date string as "June 21, 2026". Falls back to the raw value
 * if it can't be parsed.
 */
export const formatDateOnly = (value: string): string => {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return dateOnlyFormatter.format(parsedDate);
};
