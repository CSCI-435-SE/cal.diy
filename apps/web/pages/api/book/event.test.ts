import type { NextApiRequest, NextApiResponse } from "next";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { createBooking, releaseHoldAfterBooking, log } = vi.hoisted(() => {
  const log: Record<string, ReturnType<typeof vi.fn>> = {};
  const logger = new Proxy(log, {
    get: (target, prop: string) => {
      if (prop === "getSubLogger") return () => logger;
      target[prop] ??= vi.fn();
      return target[prop];
    },
  });
  return { createBooking: vi.fn(), releaseHoldAfterBooking: vi.fn(), log: logger };
});

vi.mock("@calcom/lib/logger", () => ({ default: log }));
vi.mock("@sentry/nextjs", () => ({ wrapApiHandlerWithSentry: (handler: unknown) => handler }));
vi.mock("@calcom/features/auth/lib/getServerSession", () => ({ getServerSession: async () => null }));
vi.mock("@calcom/features/bookings/di/RegularBookingService.container", () => ({
  getRegularBookingService: () => ({ createBooking }),
}));
vi.mock("@calcom/features/bot-detection", () => ({
  BotDetectionService: class {
    checkBotDetection = async () => undefined;
  },
}));
vi.mock("@calcom/features/eventtypes/repositories/eventTypeRepository", () => ({
  EventTypeRepository: class {},
}));
vi.mock("@calcom/features/flags/features.repository", () => ({ FeaturesRepository: class {} }));
vi.mock("@calcom/lib/checkRateLimitAndThrowError", () => ({
  checkRateLimitAndThrowError: async () => undefined,
}));
vi.mock("@calcom/prisma", () => ({ prisma: {} }));
vi.mock("@calcom/features/waitlist/services/getWaitlistService", () => ({
  getWaitlistService: () => ({ releaseHoldAfterBooking }),
}));

const start = "2026-11-03T10:00:00.000Z";

const book = async (cookies: Record<string, string>) => {
  const { default: handler } = await import("./event");
  const req = {
    method: "POST",
    url: "/api/book/event",
    headers: {},
    cookies,
    body: { eventTypeId: 1, start },
  } as unknown as NextApiRequest;
  const res = {
    writableEnded: false,
    setHeader: vi.fn(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  };
  await handler(req, res as unknown as NextApiResponse);
  return res;
};

describe("POST /api/book/event waitlist hold release", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createBooking.mockResolvedValue({ uid: "booking-uid" });
    releaseHoldAfterBooking.mockResolvedValue(undefined);
  });

  it("releases the hold of the waitlist offer the booker claimed", async () => {
    const res = await book({ uid: "entry-uid" });

    expect(releaseHoldAfterBooking).toHaveBeenCalledWith({
      uid: "entry-uid",
      eventTypeId: 1,
      start: new Date(start),
    });
    expect(res.json).toHaveBeenCalledWith({ uid: "booking-uid" });
  });

  it("does not look for a waitlist hold when the booker has no claim cookie", async () => {
    await book({});
    expect(releaseHoldAfterBooking).not.toHaveBeenCalled();
  });

  it("still returns the booking, and logs the error, when releasing the hold fails", async () => {
    releaseHoldAfterBooking.mockRejectedValue(new Error("db down"));

    const res = await book({ uid: "entry-uid" });

    expect(res.json).toHaveBeenCalledWith({ uid: "booking-uid" });
    expect(res.status).not.toHaveBeenCalled();
    expect(log.error).toHaveBeenCalledWith(
      "Error releasing waitlist hold",
      expect.stringContaining("db down")
    );
  });
});
