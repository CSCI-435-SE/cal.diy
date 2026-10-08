import { z } from "zod";

export type TSetFavoriteInputSchema = {
  eventTypeId: number;
  isFavorite: boolean;
};

export const ZSetFavoriteInputSchema: z.ZodType<TSetFavoriteInputSchema> = z.object({
  eventTypeId: z.number().int().positive(),
  isFavorite: z.boolean(),
});
