import { createContainer } from "@calcom/features/di/di";
import {
  type EventTypeFavoriteRepository,
  moduleLoader as eventTypeFavoriteRepositoryModuleLoader,
} from "./EventTypeFavoriteRepository.module";

const eventTypeFavoriteRepositoryContainer = createContainer();

export function getEventTypeFavoriteRepository(): EventTypeFavoriteRepository {
  eventTypeFavoriteRepositoryModuleLoader.loadModule(eventTypeFavoriteRepositoryContainer);
  return eventTypeFavoriteRepositoryContainer.get<EventTypeFavoriteRepository>(
    eventTypeFavoriteRepositoryModuleLoader.token
  );
}
