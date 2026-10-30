import { Frequency } from "@calcom/prisma/zod-utils";
import { describe, expect, it } from "vitest";
import { jsDayToRRuleWeekday, mergeRecurringEventUpdate, rruleWeekdayToJsDay } from "./recurringWeekdays";

const weekly = { interval: 1, count: 8, freq: Frequency.WEEKLY };
const savedDays = { byweekday: [1, 3], tzid: "America/New_York", wkst: 6 };

// [day, Date.getDay() number (0 = Sunday), rrule number (0 = Monday)]
const days: [string, number, number][] = [
  ["Sunday", 0, 6],
  ["Monday", 1, 0],
  ["Tuesday", 2, 1],
  ["Wednesday", 3, 2],
  ["Thursday", 4, 3],
  ["Friday", 5, 4],
  ["Saturday", 6, 5],
];

describe("weekday number conversion", () => {
  it.each(days)("%s: getDay() %i is rrule %i", (_day, jsDay, rruleWeekday) => {
    expect(jsDayToRRuleWeekday(jsDay)).toBe(rruleWeekday);
    expect(rruleWeekdayToJsDay(rruleWeekday)).toBe(jsDay);
  });

  it("matches what Date.getDay() returns for a known Tuesday", () => {
    const tuesday = new Date(Date.UTC(2026, 10, 3, 12));
    expect(jsDayToRRuleWeekday(tuesday.getUTCDay())).toBe(1);
  });

  it("round-trips every day", () => {
    for (let jsDay = 0; jsDay < 7; jsDay++) {
      expect(rruleWeekdayToJsDay(jsDayToRRuleWeekday(jsDay))).toBe(jsDay);
    }
  });
});

describe("mergeRecurringEventUpdate", () => {
  it("saves the selected days, time zone and week start of a weekly rule", () => {
    const input = { ...weekly, ...savedDays };
    expect(mergeRecurringEventUpdate(input, null)).toEqual(input);
  });

  it("uses the new days when the host changes them", () => {
    const input = { ...weekly, byweekday: [0, 4], tzid: "Europe/London", wkst: 0 };
    expect(mergeRecurringEventUpdate(input, savedDays)).toEqual(input);
  });

  it.each([Frequency.MONTHLY, Frequency.YEARLY])("drops days and week start for frequency %s", (freq) => {
    const result = mergeRecurringEventUpdate({ ...weekly, ...savedDays, freq }, savedDays);
    expect(result).toEqual({ interval: 1, count: 8, freq, tzid: "America/New_York" });
    expect(result).not.toHaveProperty("byweekday");
    expect(result).not.toHaveProperty("wkst");
  });

  it("keeps the saved days, time zone and week start when a weekly update leaves them out", () => {
    const apiV2Update = { interval: 2, count: 10, freq: Frequency.WEEKLY };
    expect(mergeRecurringEventUpdate(apiV2Update, savedDays)).toEqual({ ...apiV2Update, ...savedDays });
  });

  it("leaves a rule saved before days existed unchanged", () => {
    expect(mergeRecurringEventUpdate(weekly, { tzid: undefined })).toEqual(weekly);
    expect(mergeRecurringEventUpdate(weekly, null)).toEqual(weekly);
  });
});
