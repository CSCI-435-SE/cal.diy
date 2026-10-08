import { ErrorWithCode } from "@calcom/lib/errors";
import type { EventTypeFavoriteRepository } from "../repositories/EventTypeFavoriteRepository";
import type { EventTypeRepository } from "../repositories/eventTypeRepository";

export interface IEventTypeFavoriteServiceDeps {
  eventTypeFavoriteRepository: EventTypeFavoriteRepository;
  eventTypeRepository: EventTypeRepository;
}

export type SetFavoriteInput = { userId: number; eventTypeId: number; isFavorite: boolean };

export class EventTypeFavoriteService {
  constructor(private readonly deps: IEventTypeFavoriteServiceDeps) {}

  async setFavorite({ userId, eventTypeId, isFavorite }: SetFavoriteInput): Promise<void> {
    // if unstarring, remove it right away.
    // no permission check is needed because you can only remove your own star
    if (!isFavorite) {
      await this.deps.eventTypeFavoriteRepository.delete({ userId, eventTypeId });
      return;
    }

    // make sure the event exists and the user is actually allowed to see it

    const hasAccess = await this.deps.eventTypeRepository.existsWithUserAccess({ id: eventTypeId, userId });
    // say "Not found" whether the event is missing or private
    if (!hasAccess) {
      throw ErrorWithCode.Factory.EventTypeNotFound(`Event type ${eventTypeId} not found`);
    }

    // save the star. If someone double-clicks quickly, it safely ignores the second click
    await this.deps.eventTypeFavoriteRepository.create({ userId, eventTypeId });
  }

  // gets the list of event IDs this user has starred, newest first
  async listFavoriteIds({ userId }: { userId: number }): Promise<number[]> {
    return this.deps.eventTypeFavoriteRepository.findEventTypeIdsByUserId(userId);
  }
}
