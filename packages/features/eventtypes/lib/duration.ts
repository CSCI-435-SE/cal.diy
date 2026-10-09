import type { TFunction } from "i18next";

export const MINUTES_IN_HOUR = 60;

export type HoursAndMinutes = {
  hours: number;
  minutes: number;
};

/**
 * Event duration is stored as a single number of minutes, but issue #4 asks users to enter it
 * as hours + minutes. These two functions are the only place that conversion happens, so the
 * stored value and the public API contract stay in minutes.
 */
export function minutesToHoursAndMinutes(totalMinutes: number): HoursAndMinutes {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) {
    return { hours: 0, minutes: 0 };
  }

  const whole = Math.floor(totalMinutes);

  return {
    hours: Math.floor(whole / MINUTES_IN_HOUR),
    minutes: whole % MINUTES_IN_HOUR,
  };
}

export function hoursAndMinutesToMinutes({ hours, minutes }: HoursAndMinutes): number {
  const safeHours = Number.isFinite(hours) && hours > 0 ? Math.floor(hours) : 0;
  const safeMinutes = Number.isFinite(minutes) && minutes > 0 ? Math.floor(minutes) : 0;

  return safeHours * MINUTES_IN_HOUR + safeMinutes;
}

/**
 * Empty is not zero: an untouched hours box must read as blank rather than "0", which is what
 * keeps a 15-minute event from growing visual noise. Callers round-trip through this so an
 * empty string and a genuine 0 stay distinguishable in the input.
 */
export function parseDurationPart(raw: string): number {
  if (raw.trim() === "") return 0;

  const parsed = Number(raw);

  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

/**
 * Renders a minute count as "X mins" under an hour, or "Xh"/"Ym"/"Xh Ym" once it reaches 60+
 * minutes, reusing minutesToHoursAndMinutes so the hour/minute split lives in one place instead
 * of five near-duplicate copies (issue #35). Moved here from the booker's Duration component,
 * which was the only place this already existed.
 */
export function formatDuration(totalMinutes: number | undefined, t: TFunction): string {
  if (!totalMinutes) return "";

  const { hours, minutes } = minutesToHoursAndMinutes(totalMinutes);

  const minuteStr =
    minutes > 0
      ? minutes === 1
        ? t("minute_one_short", { count: 1 })
        : t("multiple_duration_timeUnit_short", { count: minutes, unit: "minute" })
      : "";

  const hourStr =
    hours > 0
      ? hours === 1
        ? t("hour_one_short", { count: 1 })
        : t("multiple_duration_timeUnit_short", { count: hours, unit: "hour" })
      : "";

  return [hourStr, minuteStr].filter(Boolean).join(" ");
}
