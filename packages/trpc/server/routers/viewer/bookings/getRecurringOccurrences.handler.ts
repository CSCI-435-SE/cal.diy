import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { BookingAccessService } from "@calcom/features/bookings/services/BookingAccessService";
import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { TRPCError } from "@trpc/server";
import type { TGetRecurringOccurrencesInputSchema } from "./getRecurringOccurrences.schema";

type GetRecurringOccurrencesOptions = {
  ctx: {
    user: Pick<NonNullable<TrpcSessionUser>, "id">;
  };
  input: TGetRecurringOccurrencesInputSchema;
};

export const getRecurringOccurrencesHandler = async ({ ctx, input }: GetRecurringOccurrencesOptions) => {
  const bookingAccessService = new BookingAccessService(prisma);
  const hasAccess = await bookingAccessService.doesUserIdHaveAccessToBooking({
    userId: ctx.user.id,
    bookingId: input.bookingId,
  });

  if (!hasAccess) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You don't have access to this booking" });
  }

  const bookingRepo = new BookingRepository(prisma);
  const booking = await bookingRepo.findByIdForReassignmentValidation(input.bookingId);

  if (!booking?.recurringEventId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Booking ${input.bookingId} is not part of a recurring series`,
    });
  }

  return bookingRepo.findByRecurringEventId({ recurringEventId: booking.recurringEventId });
};
