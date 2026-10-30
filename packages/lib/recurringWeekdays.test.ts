import { Frequency } from "@calcom/prisma/zod-utils";
import { describe, expect, it } from "vitest";
import { mergeRecurringEventUpdate } from "./recurringWeekdays";

const weekly = { interval: 1, count: 8, freq: Frequency.WEEKLY };
const savedDays = { byweekday: [1, 3], tzid: "America/New_York", wkst: 6 };

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
