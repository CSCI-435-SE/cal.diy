import { z } from "zod";

export type TGetRecurringOccurrencesInputSchema = {
  bookingId: number;
};

export const ZGetRecurringOccurrencesInputSchema: z.ZodType<TGetRecurringOccurrencesInputSchema> = z.object({
  bookingId: z.number().int(),
});
