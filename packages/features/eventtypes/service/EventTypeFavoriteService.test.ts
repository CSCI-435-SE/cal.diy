import { ErrorCode } from "@calcom/lib/errorCodes";
import { describe, expect, it, vi } from "vitest";
import type { EventTypeFavoriteRepository } from "../repositories/EventTypeFavoriteRepository";
import type { EventTypeRepository } from "../repositories/eventTypeRepository";
import { EventTypeFavoriteService } from "./EventTypeFavoriteService";

function setup({ hasAccess }: { hasAccess: boolean }) {
  const eventTypeFavoriteRepository = {
    create: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    findEventTypeIdsByUserId: vi.fn().mockResolvedValue([]),
  } as unknown as EventTypeFavoriteRepository;
  const eventTypeRepository = {
    existsWithUserAccess: vi.fn().mockResolvedValue(hasAccess),
  } as unknown as EventTypeRepository;
  const service = new EventTypeFavoriteService({ eventTypeFavoriteRepository, eventTypeRepository });
  return { service, eventTypeFavoriteRepository, eventTypeRepository };
}

describe("EventTypeFavoriteService", () => {
  describe("setFavorite", () => {
    it("adds the favorite when the user has access", async () => {
      const { service, eventTypeFavoriteRepository, eventTypeRepository } = setup({ hasAccess: true });

      await service.setFavorite({ userId: 1, eventTypeId: 42, isFavorite: true });

      expect(eventTypeRepository.existsWithUserAccess).toHaveBeenCalledWith({ id: 42, userId: 1 });
      expect(eventTypeFavoriteRepository.create).toHaveBeenCalledWith({ userId: 1, eventTypeId: 42 });
    });

    it("throws EventTypeNotFound and writes nothing when the user has no access", async () => {
      const { service, eventTypeFavoriteRepository } = setup({ hasAccess: false });

      await expect(
        service.setFavorite({ userId: 1, eventTypeId: 42, isFavorite: true })
      ).rejects.toMatchObject({ code: ErrorCode.EventTypeNotFound });
      expect(eventTypeFavoriteRepository.create).not.toHaveBeenCalled();
    });

    it("removes the favorite without checking access", async () => {
      const { service, eventTypeFavoriteRepository, eventTypeRepository } = setup({ hasAccess: false });

      await service.setFavorite({ userId: 1, eventTypeId: 42, isFavorite: false });

      expect(eventTypeFavoriteRepository.delete).toHaveBeenCalledWith({ userId: 1, eventTypeId: 42 });
      expect(eventTypeRepository.existsWithUserAccess).not.toHaveBeenCalled();
    });
  });
});
