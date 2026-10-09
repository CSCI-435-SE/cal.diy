import { getBookingPeopleService } from "@calcom/features/bookings/di/BookingPeopleService.container";
import type { TrpcSessionUser } from "../../../types";

type GetPeopleOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const getPeopleHandler = async ({ ctx }: GetPeopleOptions) => {
  const bookingPeopleService = getBookingPeopleService();
  return bookingPeopleService.listPeopleMet({ userId: ctx.user.id, userEmail: ctx.user.email });
};
