import WaitlistSpotOpenedEmail from "@calcom/emails/templates/waitlist-spot-opened-email";
import tasker from "@calcom/features/tasker";
import { getTranslation } from "@calcom/i18n/server";
import { WEBAPP_URL } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";
import { WaitlistRepository } from "../repositories/WaitlistRepository";
import { WaitlistService } from "./WaitlistService";

export function getWaitlistService() {
  return new WaitlistService({
    waitlistRepo: new WaitlistRepository(prisma),
    webappUrl: WEBAPP_URL,
    scheduleOfferExpiry: (entryId, at) =>
      tasker.create("expireWaitlistOffer", { entryId }, { scheduledAt: at }),
    sendOfferEmail: async (data) => {
      // shortcut: entries don't store a locale, so offers are always English; store one at join time to localize
      const t = await getTranslation("en", "common");
      return new WaitlistSpotOpenedEmail({ ...data, t }).sendEmail();
    },
  });
}
