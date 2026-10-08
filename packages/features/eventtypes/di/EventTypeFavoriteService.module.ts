import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as eventTypeRepositoryModuleLoader } from "@calcom/features/di/modules/EventType";
import { DI_TOKENS } from "@calcom/features/di/tokens";
import { EventTypeFavoriteService } from "../service/EventTypeFavoriteService";
import { moduleLoader as eventTypeFavoriteRepositoryModuleLoader } from "./EventTypeFavoriteRepository.module";

const thisModule = createModule();
const token = DI_TOKENS.EVENT_TYPE_FAVORITE_SERVICE;
const moduleToken = DI_TOKENS.EVENT_TYPE_FAVORITE_SERVICE_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: EventTypeFavoriteService,
  depsMap: {
    eventTypeFavoriteRepository: eventTypeFavoriteRepositoryModuleLoader,
    eventTypeRepository: eventTypeRepositoryModuleLoader,
  },
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { EventTypeFavoriteService };
