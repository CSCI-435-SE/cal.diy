import { getEventTypeFavoriteService } from "@calcom/features/eventtypes/di/EventTypeFavorite.container";
import type { TrpcSessionUser } from "../../../types";
import type { TSetFavoriteInputSchema } from "./setFavorite.schema";

type SetFavoriteOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TSetFavoriteInputSchema;
};

export const setFavoriteHandler = async ({ ctx, input }: SetFavoriteOptions) => {
  const eventTypeFavoriteService = getEventTypeFavoriteService();
  await eventTypeFavoriteService.setFavorite({
    userId: ctx.user.id,
    eventTypeId: input.eventTypeId,
    isFavorite: input.isFavorite,
  });
  return { eventTypeId: input.eventTypeId, isFavorite: input.isFavorite };
};
