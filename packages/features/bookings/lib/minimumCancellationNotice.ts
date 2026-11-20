import type { BookingRepository } from "../repositories/BookingRepository";

const MS_PER_MINUTE = 60 * 1000;

type HostCandidate = { id: number; email: string };

/**
 * Unlike isWithinMinimumRescheduleNotice, this stays true after the booking starts: handleCancelBooking
 * still accepts cancellations until the booking ends, so the notice window must keep covering that period.
 * Cancelling exactly `minimumCancellationNotice` minutes before the start is allowed.
 */
export function isWithinMinimumCancellationNotice({
  startTime,
  minimumCancellationNotice,
  now = new Date(),
}: {
  startTime: Date | string | null | undefined;
  minimumCancellationNotice: number | null | undefined;
  now?: Date;
}): boolean {
  if (!minimumCancellationNotice || minimumCancellationNotice <= 0 || !startTime) return false;

  const msUntilStart = new Date(startTime).getTime() - now.getTime();
  return msUntilStart < minimumCancellationNotice * MS_PER_MINUTE;
}

/**
 * Mirrors checkIfUserIsHost in bookings-single-view.getServerSideProps so the booking page and /api/cancel
 * agree on who is exempt. Relies only on the session user id, never on the client-supplied `cancelledBy`.
 */
export function isUserBookingHost({
  userId,
  bookingUserId,
  attendeeEmails,
  eventTypeHosts,
}: {
  userId: number | null | undefined;
  bookingUserId: number | null;
  attendeeEmails: string[];
  eventTypeHosts: HostCandidate[];
}): boolean {
  if (!userId) return false;
  if (bookingUserId === userId) return true;

  const attendeeEmailSet = new Set(attendeeEmails);
  return eventTypeHosts.some((host) => host.id === userId && attendeeEmailSet.has(host.email));
}

/** Returns the start of the earliest occurrence that has not started yet, or null if none remain. */
export function getEarliestUpcomingStartTime(
  startTimes: (Date | string)[],
  now: Date = new Date()
): Date | null {
  let earliest: Date | null = null;
  for (const startTime of startTimes) {
    const start = new Date(startTime);
    if (start.getTime() < now.getTime()) continue;
    if (!earliest || start.getTime() < earliest.getTime()) earliest = start;
  }
  return earliest;
}

/** Lets clients show the translated `cancellation_unavailable_minimum_notice` text instead of the English message. */
export const MINIMUM_CANCELLATION_NOTICE_ERROR_CODE = "minimum_cancellation_notice";

export function getMinimumCancellationNoticeErrorMessage(minimumCancellationNotice: number): string {
  return `This booking is within the host's minimum cancellation notice of ${minimumCancellationNotice} minutes, so attendees can no longer cancel it online. Please contact the host to cancel.`;
}

export type MinimumCancellationNoticeViolation = { minimumCancellationNotice: number };

/**
 * Returns the violated notice when an attendee cancellation must be rejected, or null when it may proceed.
 * Missing bookings are left for handleCancelBooking to report, so existing error behavior is unchanged.
 */
export async function getMinimumCancellationNoticeViolation({
  bookingRepository,
  bookingUid,
  userId,
  allRemainingBookings,
  now = new Date(),
}: {
  bookingRepository: Pick<
    BookingRepository,
    "findByUidIncludeAttendeesAndEventTypeHosts" | "findFirstActiveRecurringBookingFromDate"
  >;
  bookingUid: string;
  userId: number | null | undefined;
  allRemainingBookings?: boolean;
  now?: Date;
}): Promise<MinimumCancellationNoticeViolation | null> {
  const booking = await bookingRepository.findByUidIncludeAttendeesAndEventTypeHosts({ bookingUid });
  const minimumCancellationNotice = booking?.eventType?.minimumCancellationNotice;
  if (!booking?.eventType || !minimumCancellationNotice || minimumCancellationNotice <= 0) return null;

  const isHost = isUserBookingHost({
    userId,
    bookingUserId: booking.userId,
    attendeeEmails: booking.attendees.map((attendee) => attendee.email),
    eventTypeHosts: [...booking.eventType.hosts.map((host) => host.user), ...booking.eventType.users],
  });
  if (isHost) return null;

  let startTime = booking.startTime;
  if (allRemainingBookings && booking.recurringEventId) {
    // "Cancel all remaining" cancels every active occurrence from now on, so the earliest one decides.
    const earliestOccurrence = await bookingRepository.findFirstActiveRecurringBookingFromDate({
      recurringEventId: booking.recurringEventId,
      fromDate: now,
    });
    if (earliestOccurrence) startTime = earliestOccurrence.startTime;
  }

  return isWithinMinimumCancellationNotice({ startTime, minimumCancellationNotice, now })
    ? { minimumCancellationNotice }
    : null;
}
