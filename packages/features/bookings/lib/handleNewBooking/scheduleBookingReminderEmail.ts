import tasker from "@calcom/features/tasker";
import { DEFAULT_BOOKING_REMINDER_MINUTES } from "../bookingReminderOptions";

/**
 * Keyed on the booking uid so the existing cancel/reschedule cleanup
 * (`cancelNoShowTasksForBooking`, which deletes every task for that uid) removes it too.
 */
export async function scheduleBookingReminderEmail(
  booking: { id: number; uid: string; startTime: Date },
  reminderMinutes = DEFAULT_BOOKING_REMINDER_MINUTES
) {
  const scheduledAt = new Date(booking.startTime.getTime() - reminderMinutes * 60 * 1000);
  if (scheduledAt <= new Date()) return;

  await tasker.create(
    "sendBookingReminderEmail",
    { bookingId: booking.id, startTime: booking.startTime.toISOString() },
    { scheduledAt, referenceUid: booking.uid }
  );
}
