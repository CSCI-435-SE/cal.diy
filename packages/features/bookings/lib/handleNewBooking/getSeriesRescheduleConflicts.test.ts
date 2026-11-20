import { ErrorCode } from "@calcom/lib/errorCodes";
import { HttpError } from "@calcom/lib/http-error";
import { BookingStatus } from "@calcom/prisma/enums";
import { describe, expect, it } from "vitest";
import {
  getSeriesRescheduleConflicts,
  hasInvalidSeriesRescheduleUids,
  isReschedulableOccurrenceStatus,
  withRescheduleUidForDate,
} from "./getSeriesRescheduleConflicts";

const dates = [
  { start: "2026-11-03T19:00:00.000Z", rescheduleUid: "a" },
  { start: "2026-11-10T19:00:00.000Z", rescheduleUid: "b" },
  { start: "2026-11-17T19:00:00.000Z", rescheduleUid: "c" },
];

describe("getSeriesRescheduleConflicts", () => {
  it("returns no conflicts when every date passes", async () => {
    await expect(getSeriesRescheduleConflicts(dates, async () => undefined)).resolves.toEqual([]);
  });

  it("reports every unavailable date, not just the first", async () => {
    const conflicts = await getSeriesRescheduleConflicts(dates, async (date) => {
      if (date.rescheduleUid === "a") throw new Error(ErrorCode.NoAvailableUsersFound);
      if (date.rescheduleUid === "c") {
        throw new HttpError({ statusCode: 400, message: ErrorCode.BookingTimeOutOfBounds });
      }
    });

    expect(conflicts).toEqual([dates[0].start, dates[2].start]);
  });

  it("rethrows errors that are not about availability", async () => {
    const outage = new Error("Google Calendar API timed out");

    await expect(
      getSeriesRescheduleConflicts(dates, async (date) => {
        if (date.rescheduleUid === "a") throw new Error(ErrorCode.NoAvailableUsersFound);
        if (date.rescheduleUid === "b") throw outage;
      })
    ).rejects.toBe(outage);
  });
});

describe("withRescheduleUidForDate", () => {
  const booking = { uid: "first-occurrence", startTime: new Date("2026-11-03T19:00:00.000Z") };

  it("swaps in the uid of the occurrence the date replaces", () => {
    expect(withRescheduleUidForDate(booking, { rescheduleUid: "b" })).toEqual({ ...booking, uid: "b" });
  });

  it("returns the booking unchanged when the date replaces nothing", () => {
    expect(withRescheduleUidForDate(booking, {})).toBe(booking);
  });

  it("returns null when there is no booking being rescheduled", () => {
    expect(withRescheduleUidForDate(null, { rescheduleUid: "b" })).toBeNull();
  });
});

describe("isReschedulableOccurrenceStatus", () => {
  it("accepts only accepted and pending occurrences", () => {
    const reschedulable = Object.values(BookingStatus).filter(isReschedulableOccurrenceStatus);
    expect(reschedulable.sort()).toEqual([BookingStatus.ACCEPTED, BookingStatus.PENDING].sort());
  });
});

describe("hasInvalidSeriesRescheduleUids", () => {
  const series = [
    { uid: "a", status: BookingStatus.ACCEPTED },
    { uid: "b", status: BookingStatus.PENDING },
    { uid: "c", status: BookingStatus.ACCEPTED },
    { uid: "cancelled", status: BookingStatus.CANCELLED },
  ];

  it("accepts each upcoming occurrence of the series once", () => {
    expect(hasInvalidSeriesRescheduleUids(["a", "b", "c"], series)).toBe(false);
  });

  it("rejects an occurrence requested twice", () => {
    expect(hasInvalidSeriesRescheduleUids(["a", "a", "c"], series)).toBe(true);
  });

  it("rejects a uid that is not part of the series", () => {
    expect(hasInvalidSeriesRescheduleUids(["a", "other-series", "c"], series)).toBe(true);
  });

  it("rejects an occurrence that is no longer reschedulable", () => {
    expect(hasInvalidSeriesRescheduleUids(["a", "cancelled"], series)).toBe(true);
  });

  it("rejects a date that does not say which occurrence it replaces", () => {
    expect(hasInvalidSeriesRescheduleUids(["a", undefined], series)).toBe(true);
  });
});
