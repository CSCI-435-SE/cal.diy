import tasker from "@calcom/features/tasker";

export const BOOKING_REMINDER_LEAD_TIME_MS = 24 * 60 * 60 * 1000;

/**
 * Keyed on the booking uid so the existing cancel/reschedule cleanup
 * (`cancelNoShowTasksForBooking`, which deletes every task for that uid) removes it too.
 */
export async function scheduleBookingReminderEmail(booking: { id: number; uid: string; startTime: Date }) {
  const scheduledAt = new Date(booking.startTime.getTime() - BOOKING_REMINDER_LEAD_TIME_MS);
  if (scheduledAt <= new Date()) return;

  await tasker.create(
    "sendBookingReminderEmail",
    { bookingId: booking.id, startTime: booking.startTime.toISOString() },
    { scheduledAt, referenceUid: booking.uid }
  );
}
