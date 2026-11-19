import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as bookingRepositoryModuleLoader } from "@calcom/features/di/modules/Booking";
import { DI_TOKENS } from "@calcom/features/di/tokens";
import { RunningLateService } from "../services/RunningLateService";

const thisModule = createModule();
const token = DI_TOKENS.RUNNING_LATE_SERVICE;
const moduleToken = DI_TOKENS.RUNNING_LATE_SERVICE_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: RunningLateService,
  depsMap: {
    bookingRepository: bookingRepositoryModuleLoader,
  },
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { RunningLateService };
