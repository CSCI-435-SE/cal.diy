import prismaMock from "@calcom/testing/lib/__mocks__/prismaMock";
import { describe, expect, it } from "vitest";
import { EventTypeFavoriteRepository } from "../EventTypeFavoriteRepository";

describe("EventTypeFavoriteRepository", () => {

  // uses a fake Prisma client so tests run in memory w/o connecting to a real database
  const repository = new EventTypeFavoriteRepository(prismaMock);

  describe("create", () => {
  // verifies that saving passes the right IDs and keeps skipDuplicates enabled so double-clicks don't crash
    it("inserts the favorite and skips it if it already exists", async () => {
      await repository.create({ userId: 1, eventTypeId: 42 });

      expect(prismaMock.eventTypeFavorite.createMany).toHaveBeenCalledWith({
        data: [{ userId: 1, eventTypeId: 42 }],
        skipDuplicates: true,
      });
    });
  });

  describe("delete", () => {
    // verifies that deleting removes the correct favorite
    it("deletes only the given user's favorite for the given event type", async () => {
      await repository.delete({ userId: 1, eventTypeId: 42 });

      expect(prismaMock.eventTypeFavorite.deleteMany).toHaveBeenCalledWith({
        where: { userId: 1, eventTypeId: 42 },
      });
    });
  });

  describe("findEventTypeIdsByUserId", () => {
    // verifies the query filters by the current user, selects only the ID column, and orders newest first
    it("queries only the user's favorites, newest first, selecting only eventTypeId", async () => {
      prismaMock.eventTypeFavorite.findMany.mockResolvedValue([]);

      await expect(repository.findEventTypeIdsByUserId(1)).resolves.toEqual([]);

      expect(prismaMock.eventTypeFavorite.findMany).toHaveBeenCalledWith({
        where: { userId: 1 },
        select: { eventTypeId: true },
        orderBy: { createdAt: "desc" },
      });
    });

    // verifies return order
    it("returns plain event type ids in the order the database returns them", async () => {
      prismaMock.eventTypeFavorite.findMany.mockResolvedValue([
        { userId: 1, eventTypeId: 42, createdAt: new Date("2026-10-06T10:00:00Z") },
        { userId: 1, eventTypeId: 17, createdAt: new Date("2026-10-06T09:00:00Z") },
      ]);

      await expect(repository.findEventTypeIdsByUserId(1)).resolves.toEqual([42, 17]);
    });
  });
});
