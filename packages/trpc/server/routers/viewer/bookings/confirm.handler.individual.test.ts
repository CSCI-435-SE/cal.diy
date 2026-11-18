import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, accessMock, handleConfirmationMock, refundMock } = vi.hoisted(() => ({
  prismaMock: {
    booking: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      groupBy: vi.fn(),
    },
    profile: { findFirst: vi.fn() },
  },
  accessMock: vi.fn(),
  handleConfirmationMock: vi.fn(),
  refundMock: vi.fn(),
}));

vi.mock("@calcom/prisma", () => ({ default: prismaMock, prisma: prismaMock }));
vi.mock("@calcom/features/bookings/services/BookingAccessService", () => ({
  BookingAccessService: vi.fn().mockImplementation(function () {
    return { doesUserIdHaveAccessToBooking: accessMock };
  }),
}));
vi.mock("@calcom/features/bookings/lib/handleConfirmation", () => ({
  handleConfirmation: handleConfirmationMock,
}));
vi.mock("@calcom/features/bookings/lib/payment/processPaymentRefund", () => ({
  processPaymentRefund: refundMock,
}));
vi.mock("@calcom/app-store/delegationCredential", () => ({
  getUsersCredentialsIncludeServiceAccountKey: vi.fn().mockResolvedValue([]),
}));
vi.mock("@calcom/features/bookings/lib/getAllCredentialsForUsersOnEvent/getAllCredentials", () => ({
  getAllCredentialsIncludeServiceAccountKey: vi.fn().mockResolvedValue([]),
}));
vi.mock("@calcom/app-store/locations", () => ({
  getLocationValueForDB: vi.fn().mockReturnValue({ conferenceCredentialId: undefined }),
}));
vi.mock("@calcom/emails/email-manager", () => ({ sendDeclinedEmailsAndSMS: vi.fn() }));
vi.mock("@calcom/features/bookings/lib/handleWebhookTrigger", () => ({ handleWebhookTrigger: vi.fn() }));
vi.mock("@calcom/features/eventtypes/di/EventTypeService.container", () => ({
  getEventTypeService: vi.fn(),
}));
vi.mock("@calcom/lib/getOrgIdFromMemberOrTeamId", () => ({ default: vi.fn().mockResolvedValue(null) }));
vi.mock("@calcom/lib/getTeamIdFromEventType", () => ({ getTeamIdFromEventType: vi.fn() }));
vi.mock("@calcom/i18n/server", () => ({ getTranslation: vi.fn().mockResolvedValue((k: string) => k) }));

import { BookingStatus } from "@calcom/prisma/enums";
import { confirmHandler } from "./confirm.handler";

const future = (hours: number) => new Date(Date.now() + hours * 3600_000);

function mockBooking(overrides: Record<string, unknown> = {}) {
  prismaMock.booking.findUniqueOrThrow.mockResolvedValue({
    id: 11,
    uid: "occurrence-2",
    title: "Tennis",
    description: null,
    customInputs: null,
    startTime: future(24),
    endTime: future(25),
    attendees: [],
    eventTypeId: null,
    eventType: null,
    responses: { name: "Booker", email: "booker@example.com" },
    metadata: null,
    userPrimaryEmail: null,
    location: null,
    userId: 1,
    user: { id: 1, username: "host", email: "host@example.com", locale: "en", profiles: [] },
    payment: [],
    destinationCalendar: null,
    paid: false,
    recurringEventId: "rec",
    status: BookingStatus.PENDING,
    smsReminderNumber: null,
    assignmentReason: [],
    ...overrides,
  });
}

const ctx = {
  user: {
    id: 1,
    uuid: "u",
    email: "host@example.com",
    username: "host",
    role: "USER",
    destinationCalendar: null,
  },
  traceContext: { traceId: "t", spanId: "s", operation: "test" },
} as unknown as Parameters<typeof confirmHandler>[0]["ctx"];

describe("confirmHandler - individual recurring occurrences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    accessMock.mockResolvedValue(true);
    prismaMock.profile.findFirst.mockResolvedValue(null);
  });

  it("confirms only the requested occurrence", async () => {
    mockBooking();

    const res = await confirmHandler({ ctx, input: { bookingId: 11, confirmed: true } });

    expect(res.status).toBe(BookingStatus.ACCEPTED);
    expect(handleConfirmationMock).toHaveBeenCalledTimes(1);
    expect(handleConfirmationMock.mock.calls[0][0]).toMatchObject({
      bookingId: 11,
      recurringEventId: undefined,
    });
    expect(prismaMock.booking.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.booking.findMany).not.toHaveBeenCalled();
  });

  it("rejects only the requested occurrence and stores the reason", async () => {
    mockBooking();

    const res = await confirmHandler({
      ctx,
      input: { bookingId: 11, confirmed: false, reason: "Court unavailable" },
    });

    expect(res.status).toBe(BookingStatus.REJECTED);
    expect(prismaMock.booking.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.booking.update).toHaveBeenCalledWith({
      where: { id: 11 },
      data: { status: BookingStatus.REJECTED, rejectionReason: "Court unavailable" },
    });
    expect(prismaMock.booking.updateMany).not.toHaveBeenCalled();
  });

  it.each([
    BookingStatus.REJECTED,
    BookingStatus.CANCELLED,
  ])("refuses to act on a %s occurrence", async (status) => {
    mockBooking({ status });

    for (const confirmed of [true, false]) {
      await expect(confirmHandler({ ctx, input: { bookingId: 11, confirmed } })).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });
    }
    expect(handleConfirmationMock).not.toHaveBeenCalled();
    expect(prismaMock.booking.update).not.toHaveBeenCalled();
  });

  it("refuses to act on an already confirmed occurrence", async () => {
    mockBooking({ status: BookingStatus.ACCEPTED });

    await expect(confirmHandler({ ctx, input: { bookingId: 11, confirmed: false } })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(prismaMock.booking.update).not.toHaveBeenCalled();
  });

  it("refuses to act on an occurrence that has already ended", async () => {
    mockBooking({ startTime: future(-3), endTime: future(-2) });

    await expect(confirmHandler({ ctx, input: { bookingId: 11, confirmed: true } })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(handleConfirmationMock).not.toHaveBeenCalled();
  });

  it("refuses unauthorized users before revealing the booking status", async () => {
    accessMock.mockResolvedValue(false);
    mockBooking({ status: BookingStatus.REJECTED });

    await expect(confirmHandler({ ctx, input: { bookingId: 11, confirmed: true } })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(handleConfirmationMock).not.toHaveBeenCalled();
  });

  it("keeps Confirm all passing the series id to the bulk confirmation flow", async () => {
    mockBooking();
    prismaMock.booking.findFirst.mockResolvedValue({ id: 11 });

    const res = await confirmHandler({ ctx, input: { bookingId: 11, confirmed: true, recurringEventId: "rec" } });

    expect(res.status).toBe(BookingStatus.ACCEPTED);
    expect(handleConfirmationMock).toHaveBeenCalledTimes(1);
    expect(handleConfirmationMock.mock.calls[0][0]).toMatchObject({ bookingId: 11, recurringEventId: "rec" });
  });

  it("keeps bulk reject limited to pending occurrences of the series", async () => {
    mockBooking();
    prismaMock.booking.findFirst.mockResolvedValue({ id: 11 });
    prismaMock.booking.findMany.mockResolvedValue([{ uid: "occurrence-2", status: BookingStatus.PENDING }]);

    await confirmHandler({ ctx, input: { bookingId: 11, confirmed: false, recurringEventId: "rec" } });

    expect(prismaMock.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { recurringEventId: "rec", status: BookingStatus.PENDING } })
    );
    expect(prismaMock.booking.updateMany).toHaveBeenCalledWith({
      where: { uid: { in: ["occurrence-2"] } },
      data: { status: BookingStatus.REJECTED, rejectionReason: undefined },
    });
    expect(prismaMock.booking.update).not.toHaveBeenCalled();
  });
});
