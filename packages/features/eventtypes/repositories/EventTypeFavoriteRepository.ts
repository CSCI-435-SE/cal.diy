import type { PrismaClient } from "@calcom/prisma";

export type EventTypeFavoriteKey = { userId: number; eventTypeId: number };

// manages all database actions for favoriting event types in one place
export class EventTypeFavoriteRepository {

  // taking in the database client lets tests pass in a fake client instead of a real database
  constructor(private prismaClient: PrismaClient) {}

  // adds a favorite for a user
  // createMany + skipDuplicates ignores the second click instead of failing
  async create({ userId, eventTypeId }: EventTypeFavoriteKey): Promise<void> {
    await this.prismaClient.eventTypeFavorite.createMany({
      data: [{ userId, eventTypeId }],
      skipDuplicates: true,
    });
  }

  // removes a favorite
  // deleteMany doesn't throw when the row is already gone, unlike delete
  async delete({ userId, eventTypeId }: EventTypeFavoriteKey): Promise<void> {
    await this.prismaClient.eventTypeFavorite.deleteMany({
      where: { userId, eventTypeId },
    });
  }

  // gets a list of all event IDs favorited by the user
  // only grabs events belonging to the user
  // puts newest favorites first
  async findEventTypeIdsByUserId(userId: number): Promise<number[]> {
    const favorites = await this.prismaClient.eventTypeFavorite.findMany({
      where: { userId },
      select: { eventTypeId: true },
      orderBy: { createdAt: "desc" },
    });
    return favorites.map((favorite) => favorite.eventTypeId);
  }
}
