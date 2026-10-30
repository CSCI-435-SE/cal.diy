import type { PrismaClient } from "@calcom/prisma";
import { BookingStatus, WaitlistStatus } from "@calcom/prisma/enums";
import { getWaitlistHoldUid } from "../lib/getWaitlistHoldUid";

const entrySelect = {
  id: true,
  uid: true,
  eventTypeId: true,
  name: true,
  email: true,
  timeZone: true,
  status: true,
  hostUserId: true,
  offerStart: true,
  offerEnd: true,
  offerExpiresAt: true,
} as const;

export type WaitlistEntryDto = {
  id: number;
  uid: string;
  eventTypeId: number;
  name: string;
  email: string;
  timeZone: string;
  status: WaitlistStatus;
  hostUserId: number | null;
  offerStart: Date | null;
  offerEnd: Date | null;
  offerExpiresAt: Date | null;
};

export type WaitlistOffer = {
  hostUserId: number;
  offerStart: Date;
  offerEnd: Date;
  offerExpiresAt: Date;
};

export class WaitlistRepository {
  constructor(private prismaClient: PrismaClient) {}

  async findWaitingByEmailAndDay(data: {
    eventTypeId: number;
    email: string;
    dayStart: Date;
    slotStart: Date | null;
  }) {
    return this.prismaClient.waitlistEntry.findFirst({
      where: { ...data, status: WaitlistStatus.WAITING },
      select: entrySelect,
    });
  }

  async create(data: {
    eventTypeId: number;
    name: string;
    email: string;
    timeZone: string;
    dayStart: Date;
    dayEnd: Date;
    slotStart: Date | null;
  }): Promise<WaitlistEntryDto> {
    return this.prismaClient.waitlistEntry.create({ data, select: entrySelect });
  }

  async findByUid(uid: string): Promise<WaitlistEntryDto | null> {
    return this.prismaClient.waitlistEntry.findUnique({ where: { uid }, select: entrySelect });
  }

  async findById(id: number): Promise<WaitlistEntryDto | null> {
    return this.prismaClient.waitlistEntry.findUnique({ where: { id }, select: entrySelect });
  }

  async findOldestWaitingForTime(data: { eventTypeId: number; time: Date }) {
    return this.prismaClient.waitlistEntry.findFirst({
      where: {
        eventTypeId: data.eventTypeId,
        status: WaitlistStatus.WAITING,
        OR: [
          { slotStart: data.time },
          { slotStart: null, dayStart: { lte: data.time }, dayEnd: { gt: data.time } },
        ],
      },
      orderBy: { createdAt: "asc" },
      select: entrySelect,
    });
  }

  async isOfferedForTime(data: { eventTypeId: number; time: Date }): Promise<boolean> {
    const entry = await this.prismaClient.waitlistEntry.findFirst({
      where: { eventTypeId: data.eventTypeId, status: WaitlistStatus.OFFERED, offerStart: data.time },
      select: { id: true },
    });
    return !!entry;
  }

  /** Returns false when the entry was no longer in `fromStatus`, so concurrent transitions can't both win. */
  async transition(
    id: number,
    fromStatus: WaitlistStatus,
    toStatus: WaitlistStatus,
    offer?: WaitlistOffer | null
  ): Promise<boolean> {
    const clearOffer = { hostUserId: null, offerStart: null, offerEnd: null, offerExpiresAt: null };
    const { count } = await this.prismaClient.waitlistEntry.updateMany({
      where: { id, status: fromStatus },
      data: { status: toStatus, ...(offer === null ? clearOffer : offer) },
    });
    return count > 0;
  }

  async findEventTypeForWaitlist(eventTypeId: number) {
    return this.prismaClient.eventType.findUnique({
      where: { id: eventTypeId },
      select: {
        id: true,
        title: true,
        slug: true,
        length: true,
        team: { select: { slug: true } },
        owner: { select: { username: true } },
        users: { select: { username: true }, take: 1 },
      },
    });
  }

  async createSlotHold(data: {
    uid: string;
    eventTypeId: number;
    userId: number;
    start: Date;
    end: Date;
    releaseAt: Date;
  }) {
    await this.prismaClient.selectedSlots.create({
      data: {
        uid: getWaitlistHoldUid(data.uid),
        eventTypeId: data.eventTypeId,
        userId: data.userId,
        slotUtcStartDate: data.start,
        slotUtcEndDate: data.end,
        releaseAt: data.releaseAt,
      },
    });
  }

  async deleteSlotHolds(uid: string) {
    await this.prismaClient.selectedSlots.deleteMany({ where: { uid: getWaitlistHoldUid(uid) } });
  }

  async findActiveBookingStartTimes(data: { eventTypeId: number; from: Date; to: Date }) {
    const bookings = await this.prismaClient.booking.findMany({
      where: {
        eventTypeId: data.eventTypeId,
        startTime: { gte: data.from, lt: data.to },
        status: { in: [BookingStatus.ACCEPTED, BookingStatus.PENDING] },
      },
      select: { startTime: true },
      distinct: ["startTime"],
      orderBy: { startTime: "asc" },
    });
    return bookings.map((b) => b.startTime);
  }

  async findActiveBookingAttendeeEmailsAt(data: { eventTypeId: number; startTime: Date }) {
    const bookings = await this.prismaClient.booking.findMany({
      where: {
        eventTypeId: data.eventTypeId,
        startTime: data.startTime,
        status: { in: [BookingStatus.ACCEPTED, BookingStatus.PENDING] },
      },
      select: { attendees: { select: { email: true } } },
    });
    return bookings.length ? bookings.flatMap((b) => b.attendees.map((a) => a.email.toLowerCase())) : null;
  }
}
