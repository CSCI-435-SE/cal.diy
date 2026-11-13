import {
  RUNNING_LATE_DELAY_OPTIONS,
  RUNNING_LATE_MESSAGE_MAX_LENGTH,
  type RunningLateDelayMinutes,
} from "@calcom/features/bookings/lib/runningLate";
import { z } from "zod";

export type TRunningLateInputSchema = {
  bookingId: number;
  delayMinutes: RunningLateDelayMinutes;
  message?: string;
};

const [firstDelay, secondDelay, ...otherDelays] = RUNNING_LATE_DELAY_OPTIONS.map((minutes) =>
  z.literal(minutes)
);

export const ZRunningLateInputSchema: z.ZodType<TRunningLateInputSchema> = z.object({
  bookingId: z.number().int(),
  delayMinutes: z.union([firstDelay, secondDelay, ...otherDelays]),
  message: z.string().trim().max(RUNNING_LATE_MESSAGE_MAX_LENGTH).optional(),
});
