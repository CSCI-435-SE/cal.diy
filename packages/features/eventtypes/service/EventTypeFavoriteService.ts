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
    // Removing only deletes the caller's own row, so it needs no access check. This also lets
    // users clear favorites for event types they've since lost access to.
    if (!isFavorite) {
      await this.deps.eventTypeFavoriteRepository.delete({ userId, eventTypeId });
      return;
    }

    const hasAccess = await this.deps.eventTypeRepository.existsWithUserAccess({ id: eventTypeId, userId });
    // Same error for "doesn't exist" and "not yours" so callers can't probe for other users' event type IDs
    if (!hasAccess) {
      throw ErrorWithCode.Factory.EventTypeNotFound(`Event type ${eventTypeId} not found`);
    }

    await this.deps.eventTypeFavoriteRepository.create({ userId, eventTypeId });
  }

  async listFavoriteIds({ userId }: { userId: number }): Promise<number[]> {
    return this.deps.eventTypeFavoriteRepository.findEventTypeIdsByUserId(userId);
  }
}
