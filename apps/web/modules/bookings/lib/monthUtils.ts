import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { getWeekStart } from "./weekUtils";

const DAY_KEY_FORMAT = "YYYY-MM-DD";

/**
 * Builds the full weeks containing `month`, starting on the user's preferred weekday, as plain
 * calendar dates so the grid never shifts with the viewer's time zone.
 */
export const getMonthGrid = (month: Dayjs, weekStart: number = 0): string[][] => {
  const firstOfMonth = dayjs.utc(month.format("YYYY-MM-01"));
  const lastOfMonth = firstOfMonth.endOf("month").startOf("day");

  const weeks: string[][] = [];
  let cursor = getWeekStart(firstOfMonth, weekStart);
  while (!cursor.isAfter(lastOfMonth)) {
    const week: string[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(cursor.format(DAY_KEY_FORMAT));
      cursor = cursor.add(1, "day");
    }
    weeks.push(week);
  }
  return weeks;
};

/**
 * The API filters `startTime >= afterStartDate` and `endTime <= beforeEndDate`, so the end bound is
 * extended by a day to keep bookings that start on the last grid day but finish after midnight.
 */
export const getMonthQueryRange = (weeks: string[][], timeZone: string) => {
  // Add days before applying the zone; adding to a zoned value keeps a stale DST offset
  const endKey = dayjs
    .utc(weeks[weeks.length - 1][6])
    .add(2, "day")
    .format(DAY_KEY_FORMAT);
  return {
    afterStartDate: dayjs.tz(weeks[0][0], timeZone).toISOString(),
    beforeEndDate: dayjs.tz(endKey, timeZone).toISOString(),
  };
};

/**
 * Groups bookings by the calendar date of their start in `timeZone`, sorted by start time.
 * Deduplicates by UID only, so individual recurring occurrences each stay visible.
 */
export const groupBookingsByDay = <T extends { uid: string; startTime: string | Date }>(
  bookings: T[],
  timeZone: string
): Map<string, T[]> => {
  const seenUids = new Set<string>();
  const sorted = [...bookings].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  const byDay = new Map<string, T[]>();
  for (const booking of sorted) {
    if (seenUids.has(booking.uid)) continue;
    seenUids.add(booking.uid);

    const dayKey = dayjs(booking.startTime).tz(timeZone).format(DAY_KEY_FORMAT);
    const dayBookings = byDay.get(dayKey) ?? [];
    dayBookings.push(booking);
    byDay.set(dayKey, dayBookings);
  }
  return byDay;
};
