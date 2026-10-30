import { getWaitlistService } from "@calcom/features/waitlist/services/getWaitlistService";
import { z } from "zod";

export const offerWaitlistSpotPayloadSchema = z.object({
  eventTypeId: z.number(),
  hostUserId: z.number(),
  start: z.string(),
  end: z.string(),
});

export const expireWaitlistOfferPayloadSchema = z.object({ entryId: z.number() });

export async function offerWaitlistSpot(payload: string): Promise<void> {
  const { start, end, ...rest } = offerWaitlistSpotPayloadSchema.parse(JSON.parse(payload));
  await getWaitlistService().offerSpot({ ...rest, start: new Date(start), end: new Date(end) });
}

export async function expireWaitlistOffer(payload: string): Promise<void> {
  const { entryId } = expireWaitlistOfferPayloadSchema.parse(JSON.parse(payload));
  await getWaitlistService().expireOffer(entryId);
}
