import type { PrismaClient } from "@calcom/prisma";
import { BookingStatus, WaitlistStatus } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WaitlistRepository } from "./WaitlistRepository";

describe("WaitlistRepository", () => {
  const prismaClient = {
    waitlistEntry: { findMany: vi.fn() },
    booking: { findMany: vi.fn() },
    eventType: { findUnique: vi.fn() },
    selectedSlots: { create: vi.fn() },
  };
  let repository: WaitlistRepository;
  const from = new Date("2026-11-03T00:00:00Z");
  const to = new Date("2026-11-04T00:00:00Z");

  beforeEach(() => {
    vi.resetAllMocks();
    repository = new WaitlistRepository(prismaClient as unknown as PrismaClient);
  });

  it("finds the offers made for one time of one event type, with what's needed to tell if they are live", async () => {
    const time = new Date("2026-11-03T10:00:00Z");
    const offers = [{ email: "a@x.com", offerExpiresAt: new Date("2026-11-03T04:00:00Z") }];
    prismaClient.waitlistEntry.findMany.mockResolvedValue(offers);

    await expect(repository.findOfferedForTime({ eventTypeId: 7, time })).resolves.toEqual(offers);
    expect(prismaClient.waitlistEntry.findMany).toHaveBeenCalledWith({
      where: { eventTypeId: 7, status: WaitlistStatus.OFFERED, offerStart: time },
      select: { email: true, offerExpiresAt: true },
    });
  });

  it("counts attendees of the event type's active bookings in the range, oldest first", async () => {
    const startTime = new Date("2026-11-03T10:00:00Z");
    prismaClient.booking.findMany.mockResolvedValue([{ startTime, _count: { attendees: 2 } }]);

    await expect(repository.findActiveBookingAttendeeCounts({ eventTypeId: 7, from, to })).resolves.toEqual([
      { startTime, attendees: 2 },
    ]);
    expect(prismaClient.booking.findMany).toHaveBeenCalledWith({
      where: {
        eventTypeId: 7,
        startTime: { gte: from, lt: to },
        status: { in: [BookingStatus.ACCEPTED, BookingStatus.PENDING] },
      },
      select: { startTime: true, _count: { select: { attendees: true } } },
      orderBy: { startTime: "asc" },
    });
  });

  it("loads the event type's seat count", async () => {
    await repository.findEventTypeForWaitlist(7);
    expect(prismaClient.eventType.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 7 },
        select: expect.objectContaining({ seatsPerTimeSlot: true }),
      })
    );
  });

  it("creates a hold as a single seat when asked to", async () => {
    await repository.createSlotHold({
      uid: "entry",
      eventTypeId: 7,
      userId: 9,
      start: from,
      end: to,
      releaseAt: to,
      isSeat: true,
    });
    expect(prismaClient.selectedSlots.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ uid: "waitlist:entry", isSeat: true }),
    });
  });

  describe("whether the host turned the waitlist off", () => {
    const eventTypeRow = (metadata: unknown) => ({ id: 7, title: "Intro", seatsPerTimeSlot: null, metadata });

    it.each([
      ["turned off", { disableWaitlist: true }, true],
      ["turned back on", { disableWaitlist: false }, false],
      ["never set, as on every existing event type", { bookingReminderMinutes: 60 }, false],
      ["empty metadata", null, false],
    ])("reads %s metadata as disableWaitlist %s", async (_label, metadata, expected) => {
      prismaClient.eventType.findUnique.mockResolvedValue(eventTypeRow(metadata));

      const eventType = await repository.findEventTypeForWaitlist(7);

      expect(eventType).toEqual({ id: 7, title: "Intro", seatsPerTimeSlot: null, disableWaitlist: expected });
      expect(prismaClient.eventType.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ select: expect.objectContaining({ metadata: true }) })
      );
    });

    it("returns null for an unknown event type", async () => {
      prismaClient.eventType.findUnique.mockResolvedValue(null);
      await expect(repository.findEventTypeForWaitlist(7)).resolves.toBeNull();
    });
  });
});
