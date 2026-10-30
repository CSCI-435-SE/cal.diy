import { getWaitlistService } from "@calcom/features/waitlist/services/getWaitlistService";
import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const MAX_RANGE_MS = 62 * 24 * 60 * 60 * 1000;

const bookedTimesSchema = z
  .object({
    eventTypeId: z.coerce.number().int(),
    from: z.coerce.date(),
    to: z.coerce.date(),
  })
  .refine(({ from, to }) => to > from && to.getTime() - from.getTime() <= MAX_RANGE_MS);

async function handler(req: NextRequest) {
  const parsed = bookedTimesSchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid request" }, { status: 400 });
  }
  const times = await getWaitlistService().getBookedTimes(parsed.data);
  return NextResponse.json({ times: times.map((time) => time.toISOString()) });
}

export const GET = defaultResponderForAppDir(handler);
