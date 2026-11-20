import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const NOW = new Date("2026-11-20T12:00:00.000Z");
const MS_PER_MINUTE = 60 * 1000;
const minutesFromNow = (minutes: number) => new Date(NOW.getTime() + minutes * MS_PER_MINUTE);

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  validateCsrfToken: vi.fn(),
  checkRateLimitAndThrowError: vi.fn(),
  taskerCreate: vi.fn(),
  taskerCancelWithReference: vi.fn(),
  findByUidIncludeAttendeesAndEventTypeHosts: vi.fn(),
  findFirstActiveRecurringBookingFromDate: vi.fn(),
  checkIfFeatureIsEnabledGlobally: vi.fn(),
}));

vi.mock("app/api/defaultResponderForAppDir", () => ({
  defaultResponderForAppDir:
    (handler: (req: NextRequest) => Promise<Response>) =>
    (req: NextRequest, _context: { params: Promise<Record<string, string>> }) =>
      handler(req),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
  cookies: vi.fn().mockResolvedValue({ getAll: () => [] }),
}));

vi.mock("@lib/buildLegacyCtx", () => ({ buildLegacyRequest: vi.fn().mockReturnValue({}) }));
vi.mock("@calcom/features/auth/lib/getServerSession", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("@calcom/web/lib/validateCsrfToken", () => ({ validateCsrfToken: mocks.validateCsrfToken }));
vi.mock("@calcom/lib/checkRateLimitAndThrowError", () => ({
  checkRateLimitAndThrowError: mocks.checkRateLimitAndThrowError,
}));
vi.mock("@calcom/lib/getIP", () => ({ default: vi.fn().mockReturnValue("127.0.0.1") }));
vi.mock("@calcom/lib/server/PiiHasher", () => ({ piiHasher: { hash: (value: string) => value } }));
vi.mock("@calcom/prisma", () => ({ default: {} }));
vi.mock("@calcom/features/flags/features.repository", () => ({
  FeaturesRepository: vi.fn().mockImplementation(function () {
    return { checkIfFeatureIsEnabledGlobally: mocks.checkIfFeatureIsEnabledGlobally };
  }),
}));
vi.mock("@calcom/features/tasker", () => ({
  default: { create: mocks.taskerCreate, cancelWithReference: mocks.taskerCancelWithReference },
}));
vi.mock("@calcom/features/bookings/repositories/BookingRepository", () => ({
  BookingRepository: vi.fn().mockImplementation(function () {
    return {
      findByUidIncludeAttendeesAndEventTypeHosts: mocks.findByUidIncludeAttendeesAndEventTypeHosts,
      findFirstActiveRecurringBookingFromDate: mocks.findFirstActiveRecurringBookingFromDate,
    };
  }),
}));

import { POST } from "../route";

const ORGANIZER = { id: 1, email: "organizer@example.com" };
const CO_HOST = { id: 2, email: "cohost@example.com" };

const storedBooking = ({
  startTime,
  minimumCancellationNotice,
  recurringEventId = null,
}: {
  startTime: Date;
  minimumCancellationNotice: number | null;
  recurringEventId?: string | null;
}) => ({
  userId: ORGANIZER.id,
  startTime,
  recurringEventId,
  attendees: [{ email: "attendee@example.com" }, { email: CO_HOST.email }],
  eventType: {
    minimumCancellationNotice,
    hosts: [{ user: CO_HOST }],
    users: [ORGANIZER],
  },
});

const cancelRequest = (body: Record<string, unknown>) =>
  ({
    json: async () => ({ uid: "booking-uid", csrfToken: "a".repeat(64), ...body }),
  }) as unknown as NextRequest;

const callCancel = (body: Record<string, unknown> = {}) =>
  POST(cancelRequest(body), { params: Promise.resolve({}) });

describe("POST /api/cancel minimum cancellation notice", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.clearAllMocks();
    mocks.getServerSession.mockResolvedValue(null);
    mocks.validateCsrfToken.mockResolvedValue(null);
    mocks.findFirstActiveRecurringBookingFromDate.mockResolvedValue(null);
    mocks.checkIfFeatureIsEnabledGlobally.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects an attendee inside the window with a clear error before queuing the cancellation", async () => {
    mocks.findByUidIncludeAttendeesAndEventTypeHosts.mockResolvedValue(
      storedBooking({ startTime: minutesFromNow(3 * 60), minimumCancellationNotice: 24 * 60 })
    );

    const res = await callCancel();

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.code).toBe("minimum_cancellation_notice");
    expect(body.message).toContain("minimum cancellation notice of 1440 minutes");
    expect(body.message).toContain("contact the host");
    expect(mocks.taskerCancelWithReference).not.toHaveBeenCalled();
    expect(mocks.taskerCreate).not.toHaveBeenCalled();
  });

  it("queues an attendee cancellation exactly at the boundary", async () => {
    mocks.findByUidIncludeAttendeesAndEventTypeHosts.mockResolvedValue(
      storedBooking({ startTime: minutesFromNow(60), minimumCancellationNotice: 60 })
    );

    const res = await callCancel();

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ success: true, scheduled: true });
    expect(mocks.taskerCreate).toHaveBeenCalledTimes(1);
  });

  it("queues an attendee cancellation just outside the window", async () => {
    mocks.findByUidIncludeAttendeesAndEventTypeHosts.mockResolvedValue(
      storedBooking({ startTime: minutesFromNow(61), minimumCancellationNotice: 60 })
    );

    const res = await callCancel();

    expect(res.status).toBe(200);
    expect(mocks.taskerCreate).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["the organizer", ORGANIZER.id],
    ["a co-host attending the booking", CO_HOST.id],
  ])("queues a cancellation by %s inside the window", async (_label, userId) => {
    mocks.getServerSession.mockResolvedValue({ user: { id: userId } });
    mocks.findByUidIncludeAttendeesAndEventTypeHosts.mockResolvedValue(
      storedBooking({ startTime: minutesFromNow(5), minimumCancellationNotice: 60 })
    );

    const res = await callCancel();

    expect(res.status).toBe(200);
    expect(mocks.taskerCreate).toHaveBeenCalledWith(
      "cancelBooking",
      expect.objectContaining({ userId }),
      expect.anything()
    );
  });

  it("does not exempt an anonymous request that claims to be cancelled by the host", async () => {
    mocks.findByUidIncludeAttendeesAndEventTypeHosts.mockResolvedValue(
      storedBooking({ startTime: minutesFromNow(5), minimumCancellationNotice: 60 })
    );

    const res = await callCancel({ cancelledBy: ORGANIZER.email });

    expect(res.status).toBe(403);
    expect(mocks.taskerCreate).not.toHaveBeenCalled();
  });

  it("keeps the current behavior when the event type has no notice", async () => {
    mocks.findByUidIncludeAttendeesAndEventTypeHosts.mockResolvedValue(
      storedBooking({ startTime: minutesFromNow(5), minimumCancellationNotice: null })
    );

    const res = await callCancel();

    expect(res.status).toBe(200);
    expect(mocks.taskerCreate).toHaveBeenCalledTimes(1);
  });

  it("rejects cancelling all remaining occurrences when the earliest one is inside the window", async () => {
    mocks.findByUidIncludeAttendeesAndEventTypeHosts.mockResolvedValue(
      storedBooking({
        startTime: minutesFromNow(7 * 24 * 60),
        minimumCancellationNotice: 60,
        recurringEventId: "series-1",
      })
    );
    mocks.findFirstActiveRecurringBookingFromDate.mockResolvedValue({ startTime: minutesFromNow(30) });

    const res = await callCancel({ allRemainingBookings: true });

    expect(res.status).toBe(403);
    expect(mocks.findFirstActiveRecurringBookingFromDate).toHaveBeenCalledWith({
      recurringEventId: "series-1",
      fromDate: NOW,
    });
    expect(mocks.taskerCreate).not.toHaveBeenCalled();
  });

  it("applies the same rule when an attendee cancels a single seat", async () => {
    mocks.findByUidIncludeAttendeesAndEventTypeHosts.mockResolvedValue(
      storedBooking({ startTime: minutesFromNow(30), minimumCancellationNotice: 60 })
    );

    const res = await callCancel({ seatReferenceUid: "seat-uid" });

    expect(res.status).toBe(403);
    expect(mocks.findByUidIncludeAttendeesAndEventTypeHosts).toHaveBeenCalledWith({
      bookingUid: "booking-uid",
    });
    expect(mocks.taskerCreate).not.toHaveBeenCalled();
  });

  it("ignores a saved notice while the feature flag is off", async () => {
    mocks.checkIfFeatureIsEnabledGlobally.mockResolvedValue(false);
    mocks.findByUidIncludeAttendeesAndEventTypeHosts.mockResolvedValue(
      storedBooking({ startTime: minutesFromNow(5), minimumCancellationNotice: 60 })
    );

    const res = await callCancel();

    expect(res.status).toBe(200);
    expect(mocks.checkIfFeatureIsEnabledGlobally).toHaveBeenCalledWith("minimum-cancellation-notice");
    expect(mocks.findByUidIncludeAttendeesAndEventTypeHosts).not.toHaveBeenCalled();
    expect(mocks.taskerCreate).toHaveBeenCalledTimes(1);
  });

  it("does not look up the booking when the CSRF token is invalid", async () => {
    mocks.validateCsrfToken.mockResolvedValue(new Response(null, { status: 403 }));

    await callCancel();

    expect(mocks.findByUidIncludeAttendeesAndEventTypeHosts).not.toHaveBeenCalled();
    expect(mocks.taskerCreate).not.toHaveBeenCalled();
  });
});
