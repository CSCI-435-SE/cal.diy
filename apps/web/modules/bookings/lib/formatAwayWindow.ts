import dayjs from "@calcom/dayjs";

type AwaySlot = { away?: boolean; outOfOfficeStart?: string };

/**
 * The start and end of an out-of-office window as the booker reads them: in the booker's time zone and
 * 12-hour or 24-hour format. When the two instants fall on different dates in that zone, each one gets its
 * date, written the way the booker's locale writes it.
 */
export function formatAwayWindow(
  startIso: string,
  endIso: string,
  timeZone: string,
  timeFormat: string,
  locale?: string
): { start: string; end: string } {
  // Day.js is used because the result depends on the zone's offset at each instant, which changes on a DST day.
  const start = dayjs.utc(startIso).tz(timeZone);
  const end = dayjs.utc(endIso).tz(timeZone);

  if (start.format("YYYY-MM-DD") === end.format("YYYY-MM-DD")) {
    return { start: start.format(timeFormat), end: end.format(timeFormat) };
  }

  const date = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone });
  return {
    start: `${date.format(start.toDate())}, ${start.format(timeFormat)}`,
    end: `${date.format(end.toDate())}, ${end.format(timeFormat)}`,
  };
}

/** A day prints no clock time when every slot is away and no away panel has hours, as for a whole-day entry. */
export function dayPrintsNoTimes(slots: AwaySlot[]): boolean {
  return slots.length > 0 && slots.every((slot) => slot.away && !slot.outOfOfficeStart);
}
