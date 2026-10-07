import type { PrismaClient } from "@calcom/prisma";

export type EventTypeFavoriteKey = { userId: number; eventTypeId: number };

export class EventTypeFavoriteRepository {
  constructor(private prismaClient: PrismaClient) {}

  async create({ userId, eventTypeId }: EventTypeFavoriteKey): Promise<void> {
    // createMany + skipDuplicates compiles to INSERT ... ON CONFLICT DO NOTHING, so a double-click
    // or two concurrent requests can't fail on the composite primary key
    await this.prismaClient.eventTypeFavorite.createMany({
      data: [{ userId, eventTypeId }],
      skipDuplicates: true,
    });
  }

  async delete({ userId, eventTypeId }: EventTypeFavoriteKey): Promise<void> {
    // deleteMany does not throw when the row is already gone, unlike delete (P2025)
    await this.prismaClient.eventTypeFavorite.deleteMany({
      where: { userId, eventTypeId },
    });
  }

  async findEventTypeIdsByUserId(userId: number): Promise<number[]> {
    const favorites = await this.prismaClient.eventTypeFavorite.findMany({
      where: { userId },
      select: { eventTypeId: true },
      orderBy: { createdAt: "desc" },
    });
    return favorites.map((favorite) => favorite.eventTypeId);
  }
}
