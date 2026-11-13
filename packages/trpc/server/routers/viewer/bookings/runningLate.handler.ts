import { getRunningLateService } from "@calcom/features/bookings/di/RunningLateService.container";
import type { TrpcSessionUser } from "../../../types";
import type { TRunningLateInputSchema } from "./runningLate.schema";

type RunningLateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TRunningLateInputSchema;
};

export const runningLateHandler = async ({ ctx, input }: RunningLateOptions) => {
  const runningLateService = getRunningLateService();
  return runningLateService.sendNotice({
    bookingId: input.bookingId,
    userId: ctx.user.id,
    delayMinutes: input.delayMinutes,
    message: input.message,
  });
};
