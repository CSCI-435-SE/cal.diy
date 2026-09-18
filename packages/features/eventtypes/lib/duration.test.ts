import { MAX_EVENT_DURATION_MINUTES, MIN_EVENT_DURATION_MINUTES } from "@calcom/lib/constants";
import type { TFunction } from "i18next";
import { describe, expect, it } from "vitest";
import {
  formatDuration,
  hoursAndMinutesToMinutes,
  minutesToHoursAndMinutes,
  parseDurationPart,
} from "./duration";

// Mirrors the real en translations for minute_one_short ("{{count}}m"), hour_one_short
// ("{{count}}h"), and multiple_duration_timeUnit_short ("{{count}}$t({{unit}}_short)") without
// pulling in the full i18next setup for this unit test.
const t = ((key: string, options?: { count?: number; unit?: string }) => {
  switch (key) {
    case "minute_one_short":
      return `${options?.count}m`;
    case "hour_one_short":
      return `${options?.count}h`;
    case "multiple_duration_timeUnit_short":
      return `${options?.count}${options?.unit === "hour" ? "h" : "m"}`;
    default:
      return key;
  }
}) as TFunction;

describe("minutesToHoursAndMinutes", () => {
  it("leaves a sub-hour duration entirely in minutes", () => {
    expect(minutesToHoursAndMinutes(30)).toEqual({ hours: 0, minutes: 30 });
  });

  it("splits a duration that is exactly one hour", () => {
    expect(minutesToHoursAndMinutes(60)).toEqual({ hours: 1, minutes: 0 });
  });

  it("splits a duration that spans hours and minutes", () => {
    expect(minutesToHoursAndMinutes(90)).toEqual({ hours: 1, minutes: 30 });
  });

  it("keeps 59 minutes below the hour boundary", () => {
    expect(minutesToHoursAndMinutes(59)).toEqual({ hours: 0, minutes: 59 });
  });

  it("rolls the first minute past the hour into the minutes box", () => {
    expect(minutesToHoursAndMinutes(61)).toEqual({ hours: 1, minutes: 1 });
  });

  it("handles the documented maximum of 24 hours", () => {
    expect(minutesToHoursAndMinutes(MAX_EVENT_DURATION_MINUTES)).toEqual({ hours: 24, minutes: 0 });
  });

  it("handles the documented minimum of one minute", () => {
    expect(minutesToHoursAndMinutes(MIN_EVENT_DURATION_MINUTES)).toEqual({ hours: 0, minutes: 1 });
  });

  it.each([
    0,
    -1,
    -90,
    Number.NaN,
    Number.POSITIVE_INFINITY,
  ])("returns an empty split rather than negative boxes for %p", (input) => {
    expect(minutesToHoursAndMinutes(input)).toEqual({ hours: 0, minutes: 0 });
  });

  it("floors a fractional duration instead of producing a fractional box", () => {
    expect(minutesToHoursAndMinutes(90.7)).toEqual({ hours: 1, minutes: 30 });
  });
});

describe("hoursAndMinutesToMinutes", () => {
  it("sums hours and minutes into a single total", () => {
    expect(hoursAndMinutesToMinutes({ hours: 1, minutes: 30 })).toBe(90);
  });

  it("returns minutes unchanged when there are no hours", () => {
    expect(hoursAndMinutesToMinutes({ hours: 0, minutes: 45 })).toBe(45);
  });

  it("accepts minutes above 59 so typing 90 into the minutes box still means 90", () => {
    expect(hoursAndMinutesToMinutes({ hours: 0, minutes: 90 })).toBe(90);
  });

  it("reaches the documented maximum", () => {
    expect(hoursAndMinutesToMinutes({ hours: 24, minutes: 0 })).toBe(MAX_EVENT_DURATION_MINUTES);
  });

  it.each([
    { hours: -1, minutes: 30 },
    { hours: 1, minutes: -30 },
    { hours: Number.NaN, minutes: 30 },
    { hours: 1, minutes: Number.NaN },
  ])("treats a non-positive or non-finite part as zero for %p", (input) => {
    expect(hoursAndMinutesToMinutes(input)).toBeGreaterThanOrEqual(0);
  });

  it("ignores a negative hours value rather than subtracting from the total", () => {
    expect(hoursAndMinutesToMinutes({ hours: -1, minutes: 30 })).toBe(30);
  });
});

describe("round trip", () => {
  it.each([
    1,
    15,
    30,
    45,
    59,
    60,
    75,
    90,
    120,
    480,
    1439,
    MAX_EVENT_DURATION_MINUTES,
  ])("preserves %p minutes through split and recombine", (minutes) => {
    expect(hoursAndMinutesToMinutes(minutesToHoursAndMinutes(minutes))).toBe(minutes);
  });
});

describe("formatDuration", () => {
  it.each([0, undefined])("returns an empty string for a falsy duration (%p)", (input) => {
    expect(formatDuration(input, t)).toBe("");
  });

  it("formats a single minute with the singular short form", () => {
    expect(formatDuration(1, t)).toBe("1m");
  });

  it("leaves a sub-hour duration in minutes", () => {
    expect(formatDuration(30, t)).toBe("30m");
  });

  it("formats exactly one hour", () => {
    expect(formatDuration(60, t)).toBe("1h");
  });

  it("formats multiple whole hours", () => {
    expect(formatDuration(120, t)).toBe("2h");
  });

  it("formats hours and minutes together", () => {
    expect(formatDuration(90, t)).toBe("1h 30m");
  });

  it("uses the singular short form for exactly one hour and one minute", () => {
    expect(formatDuration(61, t)).toBe("1h 1m");
  });
});

describe("parseDurationPart", () => {
  it("reads an empty box as zero so a blank hours field is not a validation error", () => {
    expect(parseDurationPart("")).toBe(0);
  });

  it("reads a whitespace-only box as zero", () => {
    expect(parseDurationPart("   ")).toBe(0);
  });

  it("reads a typed number", () => {
    expect(parseDurationPart("30")).toBe(30);
  });

  it.each(["abc", "-5", "1e-9"])("reads unusable input %p as zero", (input) => {
    expect(parseDurationPart(input)).toBe(0);
  });

  it("floors a fractional entry", () => {
    expect(parseDurationPart("1.9")).toBe(1);
  });
});
