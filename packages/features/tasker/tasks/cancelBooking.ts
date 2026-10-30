import handleCancelBooking from "@calcom/features/bookings/lib/handleCancelBooking";
import { bookingCancelSchema } from "@calcom/prisma/zod-utils";
import { z } from "zod";

export const cancelBookingPayloadSchema = z.object({
  bookingData: bookingCancelSchema,
  userId: z.number(),
});

export async function cancelBooking(payload: string): Promise<void> {
  const { bookingData, userId } = cancelBookingPayloadSchema.parse(JSON.parse(payload));
  await handleCancelBooking({ bookingData, userId });
}
