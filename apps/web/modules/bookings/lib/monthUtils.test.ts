import dayjs from "@calcom/dayjs";
import { describe, expect, it } from "vitest";
import { getMonthGrid, getMonthQueryRange, groupBookingsByDay } from "./monthUtils";

const uidsOn = (grouped: Map<string, { uid: string }[]>, day: string) => grouped.get(day)?.map((b) => b.uid);

describe("getMonthGrid", () => {
  it.each([
    ["2026-02", 0, 4, "2026-02-01", "2026-02-28"], // 28 days starting on Sunday
    ["2028-02", 0, 5, "2028-01-30", "2028-03-04"], // 29 days (leap year)
    ["2026-09", 0, 5, "2026-08-30", "2026-10-03"], // 30 days
    ["2026-08", 0, 6, "2026-07-26", "2026-09-05"], // 31 days spanning six weeks
    ["2027-01", 0, 6, "2026-12-27", "2027-02-06"], // year boundary
    ["2026-10", 1, 5, "2026-09-28", "2026-11-01"], // Monday week start
    ["2026-02", 1, 5, "2026-01-26", "2026-03-01"],
  ])("builds %s with week start %i", (month, weekStart, weekCount, firstDay, lastDay) => {
    const weeks = getMonthGrid(dayjs(`${month}-15`), weekStart);

    expect(weeks).toHaveLength(weekCount);
    expect(weeks.every((week) => week.length === 7 && dayjs.utc(week[0]).day() === weekStart)).toBe(true);
    expect([weeks[0][0], weeks[weeks.length - 1][6]]).toEqual([firstDay, lastDay]);
  });
});

describe("getMonthQueryRange", () => {
  it("uses the selected time zone and keeps bookings ending after the last grid midnight", () => {
    const range = getMonthQueryRange(getMonthGrid(dayjs("2026-10-15"), 0), "America/New_York");

    expect(range.afterStartDate).toBe("2026-09-27T04:00:00.000Z");
    // Grid ends Oct 31, so the bound is Nov 2 00:00 EST, after the Nov 1 DST change
    expect(range.beforeEndDate).toBe("2026-11-02T05:00:00.000Z");
  });
});

describe("groupBookingsByDay", () => {
  it("groups by the selected time zone rather than UTC around midnight", () => {
    const bookings = [
      { uid: "late", startTime: "2026-10-09T02:30:00.000Z" }, // Oct 8, 22:30 in New York
      { uid: "early", startTime: "2026-10-09T04:30:00.000Z" }, // Oct 9, 00:30 in New York
    ];

    const newYork = groupBookingsByDay(bookings, "America/New_York");
    expect(uidsOn(newYork, "2026-10-08")).toEqual(["late"]);
    expect(uidsOn(newYork, "2026-10-09")).toEqual(["early"]);
    expect(uidsOn(groupBookingsByDay(bookings, "UTC"), "2026-10-09")).toEqual(["late", "early"]);
  });

  it("places bookings on the right day across a DST change, sorted by start", () => {
    const bookings = [
      { uid: "after", startTime: "2026-03-09T03:30:00.000Z" }, // Mar 8 23:30 EDT
      { uid: "before", startTime: "2026-03-08T06:30:00.000Z" }, // Mar 8 01:30 EST
    ];

    expect(uidsOn(groupBookingsByDay(bookings, "America/New_York"), "2026-03-08")).toEqual([
      "before",
      "after",
    ]);
  });

  it("keeps every recurring occurrence and drops only duplicate UIDs", () => {
    const occurrence = { uid: "occ-1", recurringEventId: "series", startTime: "2026-10-07T15:00:00.000Z" };
    const bookings = [
      { uid: "occ-2", recurringEventId: "series", startTime: "2026-10-14T15:00:00.000Z" },
      occurrence,
      { ...occurrence },
    ];

    const grouped = groupBookingsByDay(bookings, "UTC");
    expect(uidsOn(grouped, "2026-10-07")).toEqual(["occ-1"]);
    expect(uidsOn(grouped, "2026-10-14")).toEqual(["occ-2"]);
  });

  it("does not truncate months with more than 100 bookings", () => {
    const bookings = Array.from({ length: 250 }, (_, i) => ({
      uid: `uid-${i}`,
      startTime: new Date(Date.UTC(2026, 9, 1 + (i % 31), 12, i % 60)).toISOString(),
    }));

    const days = Array.from(groupBookingsByDay(bookings, "UTC").values());
    expect(days.reduce((sum, day) => sum + day.length, 0)).toBe(250);
  });
});
