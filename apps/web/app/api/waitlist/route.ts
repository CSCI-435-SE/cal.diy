import { getWaitlistService } from "@calcom/features/waitlist/services/getWaitlistService";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import getIP from "@calcom/lib/getIP";
import { piiHasher } from "@calcom/lib/server/PiiHasher";
import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const joinWaitlistSchema = z.object({
  eventTypeId: z.number().int(),
  name: z.string().trim().min(1).max(255),
  email: z.string().email(),
  timeZone: z.string().refine((tz) => Intl.supportedValuesOf("timeZone").includes(tz) || tz === "UTC"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slotStart: z.coerce.date().optional(),
});

async function handler(req: NextRequest) {
  const parsed = joinWaitlistSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid request" }, { status: 400 });
  }

  await checkRateLimitAndThrowError({
    rateLimitingType: "core",
    identifier: `api:waitlist-join:${piiHasher.hash(getIP(req))}`,
  });

  await getWaitlistService().join(parsed.data);
  return NextResponse.json({ success: true }, { status: 200 });
}

export const POST = defaultResponderForAppDir(handler);
