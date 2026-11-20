import type { PrismaClient } from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookingRepository } from "./BookingRepository";

describe("BookingRepository", () => {
  let repository: BookingRepository;
  let mockPrismaClient: {
    $queryRaw: ReturnType<typeof vi.fn>;
    booking: {
      findMany: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockPrismaClient = {
      $queryRaw: vi.fn(),
      booking: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn() },
    };

    repository = new BookingRepository(mockPrismaClient as unknown as PrismaClient);
  });

  describe("getTotalBookingDuration", () => {
    it("should return total minutes from the database result", async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([{ totalMinutes: 120 }]);

      const result = await repository.getTotalBookingDuration({
        eventId: 52,
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
      });

      expect(result).toBe(120);
      expect(mockPrismaClient.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it("should return 0 when totalMinutes is null", async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([{ totalMinutes: null }]);

      const result = await repository.getTotalBookingDuration({
        eventId: 52,
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
      });

      expect(result).toBe(0);
    });

    it("should call query when rescheduleUid is provided", async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([{ totalMinutes: 90 }]);

      const result = await repository.getTotalBookingDuration({
        eventId: 52,
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
        rescheduleUid: "existing-booking-uid",
      });

      expect(result).toBe(90);
      expect(mockPrismaClient.$queryRaw).toHaveBeenCalledTimes(1);
    });
  });

  describe("findByRecurringEventId", () => {
    it("returns the series' occurrences in chronological order with only the fields needed to act on them", async () => {
      const occurrences = [{ id: 1 }, { id: 2 }];
      mockPrismaClient.booking.findMany.mockResolvedValue(occurrences);

      const result = await repository.findByRecurringEventId({ recurringEventId: "rec" });

      expect(result).toBe(occurrences);
      expect(mockPrismaClient.booking.findMany).toHaveBeenCalledWith({
        where: { recurringEventId: "rec" },
        select: { id: true, uid: true, startTime: true, endTime: true, status: true },
        orderBy: { startTime: "asc" },
      });
    });
  });

  // "Cancel all remaining" cancels every active occurrence from now on (issue #150), so the minimum cancellation
  // notice is checked against the earliest one. "Active" follows getActiveRecurringBookingsFromDate: accepted or
  // pending occurrences of the same series that start at or after the given time.
  describe("findFirstActiveRecurringBookingFromDate", () => {
    it("asks for the series' earliest active occurrence starting at or after the given time", async () => {
      const fromDate = new Date("2026-11-20T12:00:00.000Z");
      const earliest = { startTime: new Date("2026-11-20T15:00:00.000Z") };
      mockPrismaClient.booking.findFirst.mockResolvedValue(earliest);

      const result = await repository.findFirstActiveRecurringBookingFromDate({
        recurringEventId: "series-1",
        fromDate,
      });

      expect(result).toBe(earliest);
      expect(mockPrismaClient.booking.findFirst).toHaveBeenCalledWith({
        where: {
          recurringEventId: "series-1",
          startTime: { gte: fromDate },
          status: { in: [BookingStatus.ACCEPTED, BookingStatus.PENDING] },
        },
        select: { startTime: true },
        orderBy: { startTime: "asc" },
      });
    });
  });

  // The notice check needs the booking's start, its series, the notice, and what the host rule compares: the
  // organizer, the attendees' emails, and the event type's hosts and users (issue #150). Only those fields are
  // selected, following the repository rule to select only the data a caller needs.
  describe("findByUidIncludeAttendeesAndEventTypeHosts", () => {
    it("selects only what the minimum cancellation notice and host checks need", async () => {
      const booking = { userId: 1 };
      mockPrismaClient.booking.findUnique.mockResolvedValue(booking);

      const result = await repository.findByUidIncludeAttendeesAndEventTypeHosts({
        bookingUid: "booking-uid",
      });

      expect(result).toBe(booking);
      expect(mockPrismaClient.booking.findUnique).toHaveBeenCalledWith({
        where: { uid: "booking-uid" },
        select: {
          userId: true,
          startTime: true,
          recurringEventId: true,
          attendees: { select: { email: true } },
          eventType: {
            select: {
              minimumCancellationNotice: true,
              hosts: { select: { user: { select: { id: true, email: true } } } },
              users: { select: { id: true, email: true } },
            },
          },
        },
      });
    });

    it("returns null for an unknown booking", async () => {
      mockPrismaClient.booking.findUnique.mockResolvedValue(null);

      await expect(
        repository.findByUidIncludeAttendeesAndEventTypeHosts({ bookingUid: "missing" })
      ).resolves.toBeNull();
    });
  });
});
