import { createContainer } from "@calcom/features/di/di";
import { prismaModule } from "@calcom/features/di/modules/Prisma";
import { DI_TOKENS } from "@calcom/features/di/tokens";
import {
  type BookingPeopleService,
  moduleLoader as bookingPeopleServiceModuleLoader,
} from "./BookingPeopleService.module";

const bookingPeopleServiceContainer = createContainer();
// The Attendee repository module binds to PRISMA_CLIENT without loading Prisma itself
bookingPeopleServiceContainer.load(DI_TOKENS.PRISMA_MODULE, prismaModule);

export function getBookingPeopleService(): BookingPeopleService {
  bookingPeopleServiceModuleLoader.loadModule(bookingPeopleServiceContainer);
  return bookingPeopleServiceContainer.get<BookingPeopleService>(bookingPeopleServiceModuleLoader.token);
}
