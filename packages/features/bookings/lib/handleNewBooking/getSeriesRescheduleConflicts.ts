import { ErrorCode } from "@calcom/lib/errorCodes";
import { BookingStatus } from "@calcom/prisma/enums";

// Errors meaning "this date can't be booked". Anything else (e.g. a calendar API outage) is not a
// conflict and must surface as-is instead of being reported to the user as a busy date.
const DATE_UNAVAILABLE_ERRORS: Set<string> = new Set<string>([
  ErrorCode.NoAvailableUsersFound,
  ErrorCode.FixedHostsUnavailableForBooking,
  ErrorCode.BookingNotAllowedByRestrictionSchedule,
  ErrorCode.BookingTimeOutOfBounds,
]);

const isDateUnavailableError = (error: unknown): boolean =>
  error instanceof Error && DATE_UNAVAILABLE_ERRORS.has(error.message);

export type SeriesRescheduleDate = {
  start: string;
  end?: string;
  rescheduleUid?: string;
};

/**
 * Runs `checkDate` for every date of a series reschedule and returns the starts of the dates that
 * can't be booked. Checks run in parallel so a long series costs about as much as a single check.
 */
export async function getSeriesRescheduleConflicts(
  dates: SeriesRescheduleDate[],
  checkDate: (date: SeriesRescheduleDate) => Promise<unknown>
): Promise<string[]> {
  const results = await Promise.allSettled(dates.map((date) => checkDate(date)));

  const conflictingDates: string[] = [];
  results.forEach((result, index) => {
    if (result.status === "fulfilled") return;
    if (!isDateUnavailableError(result.reason)) throw result.reason;
    conflictingDates.push(dates[index].start);
  });

  return conflictingDates;
}

/**
 * Availability checks only read the rescheduled booking's uid (to skip it as busy) and its duration.
 * Every occurrence in a series has the same duration, so swapping the uid lets each new date skip
 * the old occurrence it replaces instead of only the first one.
 */
export function withRescheduleUidForDate<T extends { uid: string }>(
  booking: T | null,
  date: { rescheduleUid?: string }
): T | null {
  if (!booking || !date.rescheduleUid) return booking;
  return { ...booking, uid: date.rescheduleUid };
}

// Shared by the reschedule page (which occurrences to offer) and the server guard (which to accept),
// so the two can't drift apart.
export const isReschedulableOccurrenceStatus = (status: BookingStatus): boolean =>
  status === BookingStatus.ACCEPTED || status === BookingStatus.PENDING;

/**
 * A series reschedule must replace each upcoming occurrence of one series at most once. Anything else
 * (a duplicate, a uid from another series, an occurrence cancelled meanwhile) would fail mid-way once
 * the per-slot writes have started.
 */
export function hasInvalidSeriesRescheduleUids(
  requestedUids: (string | undefined)[],
  seriesOccurrences: { uid: string; status: BookingStatus }[]
): boolean {
  const reschedulableUids = new Set(
    seriesOccurrences
      .filter((occurrence) => isReschedulableOccurrenceStatus(occurrence.status))
      .map((occurrence) => occurrence.uid)
  );
  const hasDuplicates = new Set(requestedUids).size !== requestedUids.length;
  return hasDuplicates || requestedUids.some((uid) => !uid || !reschedulableUids.has(uid));
}
