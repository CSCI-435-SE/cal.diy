import { sendBookingReminderEmails } from "@calcom/emails/email-manager";
import { getBooking } from "@calcom/features/bookings/lib/payment/getBooking";
import logger from "@calcom/lib/logger";
import { BookingStatus } from "@calcom/prisma/enums";
import { z } from "zod";

const log = logger.getSubLogger({ prefix: ["sendBookingReminderEmail"] });

export const sendBookingReminderEmailPayloadSchema = z.object({
  bookingId: z.number(),
  startTime: z.string(),
});

export async function sendBookingReminderEmail(payload: string): Promise<void> {
  const { bookingId, startTime } = sendBookingReminderEmailPayloadSchema.parse(JSON.parse(payload));

  const { booking, evt, eventType } = await getBooking(bookingId);

  // Cancel/reschedule flows delete this task, but re-check so a stale task never reminds about the wrong time
  if (booking.status !== BookingStatus.ACCEPTED || booking.startTime.toISOString() !== startTime) {
    log.debug(`Skipping reminder for booking ${bookingId}: no longer accepted at ${startTime}`);
    return;
  }

  await sendBookingReminderEmails(evt, eventType.metadata);
}
