import dayjs from "@calcom/dayjs";

type SeriesOccurrence = {
  uid: string;
  startTime: Date | string;
};

const toLocalDate = (time: Date | string, timeZone: string): string =>
  dayjs(time).tz(timeZone).format("YYYY-MM-DD");

export type ShiftedOccurrence = {
  rescheduleUid: string;
  start: string;
  end: string;
};

/**
 * Moves every occurrence by the same number of calendar days and sets the new wall-clock time in
 * `timeZone`. Building each date from "date + clock time" (instead of adding a fixed number of
 * milliseconds) keeps the attendee's time stable across DST changes and preserves gaps left by
 * cancelled occurrences.
 */
export function shiftSeriesOccurrences({
  occurrences,
  oldAnchorStart,
  newAnchorStart,
  timeZone,
  durationMinutes,
}: {
  occurrences: SeriesOccurrence[];
  oldAnchorStart: Date | string;
  newAnchorStart: Date | string;
  timeZone: string;
  durationMinutes: number;
}): ShiftedOccurrence[] {
  // Calendar dates are compared as UTC dates, which are always 24h long; diffing local days across
  // a DST change would yield 23h or 25h and round to the wrong number of days.
  const dayOffset = dayjs
    .utc(toLocalDate(newAnchorStart, timeZone))
    .diff(dayjs.utc(toLocalDate(oldAnchorStart, timeZone)), "day");
  const newClockTime = dayjs(newAnchorStart).tz(timeZone).format("HH:mm");

  return occurrences.map((occurrence) => {
    const newDate = dayjs.utc(toLocalDate(occurrence.startTime, timeZone)).add(dayOffset, "day");
    const start = dayjs.tz(`${newDate.format("YYYY-MM-DD")}T${newClockTime}`, timeZone);
    return {
      rescheduleUid: occurrence.uid,
      start: start.toISOString(),
      end: start.add(durationMinutes, "minute").toISOString(),
    };
  });
}
