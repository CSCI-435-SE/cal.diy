import { createContainer } from "@calcom/features/di/di";
import { prismaModule } from "@calcom/features/di/modules/Prisma";
import { DI_TOKENS } from "@calcom/features/di/tokens";
import {
  // only import the type so TS knows what this function returns, w/o adding extra code
  type EventTypeFavoriteRepository,
  moduleLoader as eventTypeFavoriteRepositoryModuleLoader,
} from "./EventTypeFavoriteRepository.module";
import {
  type EventTypeFavoriteService,
  moduleLoader as eventTypeFavoriteServiceModuleLoader,
} from "./EventTypeFavoriteService.module";

// created once the file is imported so all function calls share the same same container
const eventTypeFavoriteContainer = createContainer();
// EventType's repository module doesn't load Prisma itself; without this the service
// would only work because the favorites repository module happens to load it
eventTypeFavoriteContainer.load(DI_TOKENS.PRISMA_MODULE, prismaModule);

// app code should use getEventTypeFavoriteService; this getter exists so the integration test
// can exercise the repository's DI wiring against a real database
export function getEventTypeFavoriteRepository(): EventTypeFavoriteRepository {
  // tells the container how to create the repository and what dependencies to give it.
  eventTypeFavoriteRepositoryModuleLoader.loadModule(eventTypeFavoriteContainer);

  // uses the key to find the module (instructions), builds the repository with Prisma, and returns it.
  return eventTypeFavoriteContainer.get<EventTypeFavoriteRepository>(
    eventTypeFavoriteRepositoryModuleLoader.token
  );
}

export function getEventTypeFavoriteService(): EventTypeFavoriteService {
  eventTypeFavoriteServiceModuleLoader.loadModule(eventTypeFavoriteContainer);
  return eventTypeFavoriteContainer.get<EventTypeFavoriteService>(eventTypeFavoriteServiceModuleLoader.token);
}
