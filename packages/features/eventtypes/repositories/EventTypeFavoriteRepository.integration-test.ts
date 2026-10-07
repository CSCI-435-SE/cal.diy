import { getEventTypeFavoriteRepository } from "@calcom/features/eventtypes/di/EventTypeFavoriteRepository.container";
import { prisma } from "@calcom/prisma";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { EventTypeFavoriteRepository } from "./EventTypeFavoriteRepository";

const testRunId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

let repository: EventTypeFavoriteRepository;
let userAId: number;
let userBId: number;
let eventTypeOneId: number;
let eventTypeTwoId: number;

async function createTestUser(label: string): Promise<number> {
  const user = await prisma.user.create({
    data: {
      email: `favorite-${label}-${testRunId}@example.com`,
      username: `favorite-${label}-${testRunId}`,
    },
    select: { id: true },
  });
  return user.id;
}

async function createTestEventType(ownerId: number, label: string): Promise<number> {
  const eventType = await prisma.eventType.create({
    data: { title: `Favorite ${label}`, slug: `favorite-${label}-${testRunId}`, length: 30, userId: ownerId },
    select: { id: true },
  });
  return eventType.id;
}

describe("EventTypeFavoriteRepository Integration Tests", () => {
  beforeAll(async () => {
    repository = getEventTypeFavoriteRepository();
    userAId = await createTestUser("a");
    userBId = await createTestUser("b");
    eventTypeOneId = await createTestEventType(userAId, "one");
    eventTypeTwoId = await createTestEventType(userAId, "two");
  });

  afterEach(async () => {
    await prisma.eventTypeFavorite.deleteMany({ where: { userId: { in: [userAId, userBId] } } });
  });

  afterAll(async () => {
    // Deleting the users cascades to the event types they own and to any remaining favorites
    await prisma.user.deleteMany({ where: { id: { in: [userAId, userBId] } } });
  });

  it("keeps a single favorite when the same star is sent concurrently", async () => {
    const favorite = { userId: userAId, eventTypeId: eventTypeOneId };

    await Promise.all([repository.create(favorite), repository.create(favorite)]);

    expect(await prisma.eventTypeFavorite.count({ where: favorite })).toBe(1);
  });

  it("removes only the unstarred favorite", async () => {
    await repository.create({ userId: userAId, eventTypeId: eventTypeOneId });
    await repository.create({ userId: userAId, eventTypeId: eventTypeTwoId });

    await repository.delete({ userId: userAId, eventTypeId: eventTypeOneId });

    expect(await repository.findEventTypeIdsByUserId(userAId)).toEqual([eventTypeTwoId]);
  });

  it("does not throw when unstarring an event type that is not starred", async () => {
    await expect(
      repository.delete({ userId: userAId, eventTypeId: eventTypeOneId })
    ).resolves.toBeUndefined();
  });

  it("keeps each user's favorites separate", async () => {
    await repository.create({ userId: userAId, eventTypeId: eventTypeOneId });
    await repository.create({ userId: userBId, eventTypeId: eventTypeTwoId });

    expect(await repository.findEventTypeIdsByUserId(userAId)).toEqual([eventTypeOneId]);
    expect(await repository.findEventTypeIdsByUserId(userBId)).toEqual([eventTypeTwoId]);
  });

  it("returns the most recently starred event types first", async () => {
    await prisma.eventTypeFavorite.createMany({
      data: [
        { userId: userAId, eventTypeId: eventTypeOneId, createdAt: new Date("2026-01-01T00:00:00Z") },
        { userId: userAId, eventTypeId: eventTypeTwoId, createdAt: new Date("2026-01-02T00:00:00Z") },
      ],
    });

    expect(await repository.findEventTypeIdsByUserId(userAId)).toEqual([eventTypeTwoId, eventTypeOneId]);
  });

  it("removes the favorite when the event type is deleted", async () => {
    const eventTypeId = await createTestEventType(userAId, "deleted");
    await repository.create({ userId: userAId, eventTypeId });

    await prisma.eventType.delete({ where: { id: eventTypeId } });

    expect(await repository.findEventTypeIdsByUserId(userAId)).toEqual([]);
  });

  it("rejects a favorite for an event type that does not exist", async () => {
    const eventTypeId = await createTestEventType(userAId, "missing");
    await prisma.eventType.delete({ where: { id: eventTypeId } });

    await expect(repository.create({ userId: userAId, eventTypeId })).rejects.toMatchObject({
      code: "P2003",
    });
  });
});
