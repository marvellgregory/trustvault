export const GIFT_VAULT_TIME_ZONES = [
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "UTC", label: "UTC" },
  { value: "Europe/London", label: "London" },
  { value: "America/New_York", label: "New York" },
  { value: "America/Los_Angeles", label: "Los Angeles" },
  { value: "Asia/Dubai", label: "Dubai" },
  { value: "Asia/Singapore", label: "Singapore" },
  { value: "Asia/Tokyo", label: "Tokyo" },
  { value: "Australia/Sydney", label: "Sydney" },
] as const;

type DateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function parseDateTime(date: string, time: string): DateParts {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time);

  if (!dateMatch || !timeMatch) {
    throw new Error("Choose a valid unlock date and time.");
  }

  const parts = {
    year: Number(dateMatch[1]),
    month: Number(dateMatch[2]),
    day: Number(dateMatch[3]),
    hour: Number(timeMatch[1]),
    minute: Number(timeMatch[2]),
    second: 0,
  };

  if (
    parts.month < 1 ||
    parts.month > 12 ||
    parts.day < 1 ||
    parts.day > 31 ||
    parts.hour < 0 ||
    parts.hour > 23 ||
    parts.minute < 0 ||
    parts.minute > 59
  ) {
    throw new Error("Choose a valid unlock date and time.");
  }

  return parts;
}

function partsInTimeZone(timestampMs: number, timeZone: string): DateParts {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const values = Object.fromEntries(
    formatter
      .formatToParts(new Date(timestampMs))
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

function utcFromParts(parts: DateParts) {
  return Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
}

function sameMinute(a: DateParts, b: DateParts) {
  return (
    a.year === b.year &&
    a.month === b.month &&
    a.day === b.day &&
    a.hour === b.hour &&
    a.minute === b.minute
  );
}

export function getDefaultGiftTimeZone() {
  try {
    const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return browserZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function zonedDateTimeToUnixSeconds(
  date: string,
  time: string,
  timeZone: string,
) {
  const desired = parseDateTime(date, time);
  const naiveUtc = utcFromParts(desired);

  // Two passes account for zones whose offset changes near the selected instant.
  const firstObserved = partsInTimeZone(naiveUtc, timeZone);
  let candidate =
    naiveUtc - (utcFromParts(firstObserved) - naiveUtc);

  const secondObserved = partsInTimeZone(candidate, timeZone);
  candidate -= utcFromParts(secondObserved) - naiveUtc;

  const verified = partsInTimeZone(candidate, timeZone);

  if (!sameMinute(verified, desired)) {
    throw new Error(
      "That local time is not available in the selected timezone. Choose another time.",
    );
  }

  return Math.floor(candidate / 1000);
}

export function formatGiftUnlock(
  unixSeconds: number,
  timeZone: string,
) {
  const date = new Date(unixSeconds * 1000);

  const local = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);

  return {
    local,
    utc: date.toISOString(),
  };
}

export function isFutureGiftUnlock(
  date: string,
  time: string,
  timeZone: string,
) {
  try {
    const unix = zonedDateTimeToUnixSeconds(date, time, timeZone);
    return unix > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

