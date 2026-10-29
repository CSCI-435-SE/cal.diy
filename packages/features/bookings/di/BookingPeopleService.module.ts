import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { DI_TOKENS } from "@calcom/features/di/tokens";
import { BookingPeopleService } from "../services/BookingPeopleService";
import { moduleLoader as attendeeRepositoryModuleLoader } from "./Attendee.module";

const thisModule = createModule();
const token = DI_TOKENS.BOOKING_PEOPLE_SERVICE;
const moduleToken = DI_TOKENS.BOOKING_PEOPLE_SERVICE_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: BookingPeopleService,
  depsMap: {
    attendeeRepository: attendeeRepositoryModuleLoader,
  },
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { BookingPeopleService };
