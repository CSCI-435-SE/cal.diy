import { HttpError } from "@calcom/lib/http-error";
import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcSessionUser } from "../../../types";
import { runningLateHandler } from "./runningLate.handler";

const { checkRateLimitAndThrowError, sendNotice } = vi.hoisted(() => ({
  checkRateLimitAndThrowError: vi.fn(),
  sendNotice: vi.fn(),
}));

vi.mock("@calcom/lib/checkRateLimitAndThrowError", () => ({ checkRateLimitAndThrowError }));

vi.mock("@calcom/features/bookings/di/RunningLateService.container", () => ({
  getRunningLateService: () => ({ sendNotice }),
}));

const ctx = { user: { id: 7 } as NonNullable<TrpcSessionUser> };
const input = { bookingId: 42, delayMinutes: 15 as const, message: "Stuck in traffic" };

describe("runningLateHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkRateLimitAndThrowError.mockResolvedValue(undefined);
    sendNotice.mockResolvedValue({ recipientCount: 2 });
  });

  it("checks the running late rate limit keyed by user and booking", async () => {
    await runningLateHandler({ ctx, input });

    expect(checkRateLimitAndThrowError).toHaveBeenCalledWith({
      rateLimitingType: "runningLate",
      identifier: "runningLate:7:42",
    });
  });

  it("passes the session user and input to the service", async () => {
    await expect(runningLateHandler({ ctx, input })).resolves.toEqual({ recipientCount: 2 });

    expect(sendNotice).toHaveBeenCalledWith({
      bookingId: 42,
      userId: 7,
      delayMinutes: 15,
      message: "Stuck in traffic",
    });
  });

  it("returns TOO_MANY_REQUESTS without sending when the rate limit is exceeded", async () => {
    checkRateLimitAndThrowError.mockRejectedValue(
      new HttpError({ statusCode: 429, message: "Rate limit exceeded. Try again in 240 seconds." })
    );

    const error = await runningLateHandler({ ctx, input }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(TRPCError);
    expect(error).toMatchObject({
      code: "TOO_MANY_REQUESTS",
      message: "Rate limit exceeded. Try again in 240 seconds.",
    });
    expect(sendNotice).not.toHaveBeenCalled();
  });

  it("rethrows other rate limiter errors unchanged", async () => {
    const failure = new HttpError({ statusCode: 500, message: "limiter down" });
    checkRateLimitAndThrowError.mockRejectedValue(failure);

    await expect(runningLateHandler({ ctx, input })).rejects.toBe(failure);
    expect(sendNotice).not.toHaveBeenCalled();
  });
});
