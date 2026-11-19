import { createContainer } from "@calcom/features/di/di";
import { prismaModule } from "@calcom/features/di/modules/Prisma";
import { DI_TOKENS } from "@calcom/features/di/tokens";
import {
  type RunningLateService,
  moduleLoader as runningLateServiceModuleLoader,
} from "./RunningLateService.module";

const runningLateServiceContainer = createContainer();
// The Booking repository module binds to PRISMA_CLIENT without loading Prisma itself
runningLateServiceContainer.load(DI_TOKENS.PRISMA_MODULE, prismaModule);

export function getRunningLateService(): RunningLateService {
  runningLateServiceModuleLoader.loadModule(runningLateServiceContainer);
  return runningLateServiceContainer.get<RunningLateService>(runningLateServiceModuleLoader.token);
}
