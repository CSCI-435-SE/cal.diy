import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { BookingAccessService } from "@calcom/features/bookings/services/BookingAccessService";
import { BookingStatus } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getRecurringOccurrencesHandler } from "./getRecurringOccurrences.handler";

vi.mock("@calcom/features/bookings/repositories/BookingRepository");
vi.mock("@calcom/features/bookings/services/BookingAccessService");
vi.mock("@calcom/prisma", () => ({ default: {}, prisma: {} }));

describe("getRecurringOccurrencesHandler", () => {
  const mockBookingRepo = {
    findByIdForReassignmentValidation: vi.fn(),
    findByRecurringEventId: vi.fn(),
  };
  const mockBookingAccessService = { doesUserIdHaveAccessToBooking: vi.fn() };
  const ctx = { user: { id: 1 } };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(BookingRepository).mockImplementation(function () {
      return mockBookingRepo;
    });
    vi.mocked(BookingAccessService).mockImplementation(function () {
      return mockBookingAccessService;
    });
  });

  it("throws FORBIDDEN and does not read the series when the user has no access", async () => {
    mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(false);

    await expect(getRecurringOccurrencesHandler({ ctx, input: { bookingId: 10 } })).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: expect.stringMatching(/\S/),
    });
    expect(mockBookingAccessService.doesUserIdHaveAccessToBooking).toHaveBeenCalledWith({
      userId: 1,
      bookingId: 10,
    });
    expect(mockBookingRepo.findByRecurringEventId).not.toHaveBeenCalled();
  });

  it("throws BAD_REQUEST when the booking is not recurring", async () => {
    mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
    mockBookingRepo.findByIdForReassignmentValidation.mockResolvedValue({ id: 10, recurringEventId: null });

    await expect(getRecurringOccurrencesHandler({ ctx, input: { bookingId: 10 } })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringMatching(/\b10\b/),
    });
  });

  it("throws BAD_REQUEST when the booking does not exist", async () => {
    mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
    mockBookingRepo.findByIdForReassignmentValidation.mockResolvedValue(null);

    await expect(getRecurringOccurrencesHandler({ ctx, input: { bookingId: 10 } })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(mockBookingRepo.findByRecurringEventId).not.toHaveBeenCalled();
  });

  it("returns every occurrence of the series", async () => {
    const occurrences = [
      { id: 10, uid: "a", startTime: new Date(), endTime: new Date(), status: BookingStatus.ACCEPTED },
      { id: 11, uid: "b", startTime: new Date(), endTime: new Date(), status: BookingStatus.PENDING },
    ];
    mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
    mockBookingRepo.findByIdForReassignmentValidation.mockResolvedValue({ id: 10, recurringEventId: "rec" });
    mockBookingRepo.findByRecurringEventId.mockResolvedValue(occurrences);

    const result = await getRecurringOccurrencesHandler({ ctx, input: { bookingId: 10 } });

    expect(mockBookingRepo.findByRecurringEventId).toHaveBeenCalledWith({ recurringEventId: "rec" });
    expect(result).toEqual(occurrences);
  });
});
