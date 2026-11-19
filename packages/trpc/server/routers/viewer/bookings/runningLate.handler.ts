import { getRunningLateService } from "@calcom/features/bookings/di/RunningLateService.container";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { HttpError } from "@calcom/lib/http-error";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "../../../types";
import type { TRunningLateInputSchema } from "./runningLate.schema";

type RunningLateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TRunningLateInputSchema;
};

export const runningLateHandler = async ({ ctx, input }: RunningLateOptions) => {
  await checkRunningLateRateLimit({ userId: ctx.user.id, bookingId: input.bookingId });

  const runningLateService = getRunningLateService();
  return runningLateService.sendNotice({
    bookingId: input.bookingId,
    userId: ctx.user.id,
    delayMinutes: input.delayMinutes,
    message: input.message,
  });
};

async function checkRunningLateRateLimit({ userId, bookingId }: { userId: number; bookingId: number }) {
  try {
    // Keyed by user as well as booking so a non-host hitting this endpoint can't use up the host's quota
    await checkRateLimitAndThrowError({
      rateLimitingType: "runningLate",
      identifier: `runningLate:${userId}:${bookingId}`,
    });
  } catch (error) {
    // errorConversionMiddleware only converts ErrorWithCode, so an HttpError would reach the client as a 500
    if (error instanceof HttpError && error.statusCode === 429) {
      throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: error.message, cause: error });
    }
    throw error;
  }
}
