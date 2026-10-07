import { createContainer } from "@calcom/features/di/di";
import {
  // only import the type so TS knows what this function returns, w/o adding extra code
  type EventTypeFavoriteRepository,
  moduleLoader as eventTypeFavoriteRepositoryModuleLoader,
} from "./EventTypeFavoriteRepository.module";

// created once the file is imported so all function calls share the same same container
const eventTypeFavoriteRepositoryContainer = createContainer();

// helper function to that API routes and routers call to get the repository
// caller functions don't need to manually pass Prisma or manage dependencies
export function getEventTypeFavoriteRepository(): EventTypeFavoriteRepository {
  // tells the container how to create the repository and what dependencies to give it.
  eventTypeFavoriteRepositoryModuleLoader.loadModule(eventTypeFavoriteRepositoryContainer);
  
  // uses the key to find the module (instructions), builds the repository with Prisma, and returns it.
  return eventTypeFavoriteRepositoryContainer.get<EventTypeFavoriteRepository>(
    eventTypeFavoriteRepositoryModuleLoader.token
  );
}
