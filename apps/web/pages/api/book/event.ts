import process from "node:process";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { getRegularBookingService } from "@calcom/features/bookings/di/RegularBookingService.container";
import { BotDetectionService } from "@calcom/features/bot-detection";
import { EventTypeRepository } from "@calcom/features/eventtypes/repositories/eventTypeRepository";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { getWaitlistService } from "@calcom/features/waitlist/services/getWaitlistService";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import getIP from "@calcom/lib/getIP";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { checkCfTurnstileToken } from "@calcom/lib/server/checkCfTurnstileToken";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import { piiHasher } from "@calcom/lib/server/PiiHasher";
import type { TraceContext } from "@calcom/lib/tracing";
import { prisma } from "@calcom/prisma";
import { CreationSource } from "@calcom/prisma/enums";
import type { NextApiRequest } from "next";

const log = logger.getSubLogger({ prefix: ["book/event"] });

async function handler(req: NextApiRequest & { userId?: number; traceContext: TraceContext }) {
  const userIp = getIP(req);

  if (process.env.NEXT_PUBLIC_CLOUDFLARE_USE_TURNSTILE_IN_BOOKER === "1") {
    await checkCfTurnstileToken({
      token: req.body["cfToken"] as string,
      remoteIp: userIp,
    });
  }

  // Check for bot detection using feature flag
  const featuresRepository = new FeaturesRepository(prisma);
  const eventTypeRepository = new EventTypeRepository(prisma);
  const botDetectionService = new BotDetectionService(featuresRepository, eventTypeRepository);

  await botDetectionService.checkBotDetection({
    eventTypeId: req.body.eventTypeId,
    headers: req.headers,
  });

  await checkRateLimitAndThrowError({
    rateLimitingType: "core",
    identifier: `createBooking:${piiHasher.hash(userIp)}`,
  });

  const session = await getServerSession({ req });
  /* To mimic API behavior and comply with types */
  req.body = {
    ...req.body,
    creationSource: CreationSource.WEBAPP,
  };

  const regularBookingService = getRegularBookingService();
  const booking = await regularBookingService.createBooking({
    bookingData: req.body,
    bookingMeta: {
      userId: session?.user?.id || -1,
      hostname: req.headers.host || "",
      forcedSlug: req.headers["x-cal-force-slug"] as string | undefined,
      traceContext: req.traceContext,
    },
  });

  // A booker who arrived via a waitlist claim link carries the entry uid in the `uid` cookie
  const waitlistUid = req.cookies.uid;
  if (waitlistUid && req.body.eventTypeId && req.body.start) {
    await getWaitlistService()
      .releaseHoldAfterBooking({
        uid: waitlistUid,
        eventTypeId: Number(req.body.eventTypeId),
        start: new Date(req.body.start),
      })
      .catch((error) => log.error("Error releasing waitlist hold", safeStringify(error)));
  }

  return booking;
}

export default defaultResponder(handler, "/api/book/event");
