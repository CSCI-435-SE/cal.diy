import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import tasker from "@calcom/features/tasker";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import getIP from "@calcom/lib/getIP";
import { piiHasher } from "@calcom/lib/server/PiiHasher";
import { bookingCancelWithCsrfSchema } from "@calcom/prisma/zod-utils";
import { validateCsrfToken } from "@calcom/web/lib/validateCsrfToken";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { cookies, headers } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const SOFT_CANCEL_DELAY_MS = 5 * 60 * 1000;

async function handler(req: NextRequest) {
  let appDirRequestBody;
  try {
    appDirRequestBody = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON" }, { status: 400 });
  }
  const bookingData = bookingCancelWithCsrfSchema.parse(appDirRequestBody);

  // Integer IDs are sequential/guessable — only accept high-entropy UIDs on this route
  if (!bookingData.uid) {
    return NextResponse.json(
      { success: false, message: "uid is required for booking cancellation" },
      { status: 400 }
    );
  }

  const csrfError = await validateCsrfToken(bookingData.csrfToken);
  if (csrfError) {
    return csrfError;
  }

  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  // Rate limit: 10 booking cancellations per 60 seconds per user (or IP if not authenticated)
  const identifier = session?.user?.id
    ? `api:cancel-user:${session.user.id}`
    : `api:cancel-ip:${piiHasher.hash(getIP(req))}`;
  await checkRateLimitAndThrowError({
    rateLimitingType: "core",
    identifier,
  });

  // Strip integer id to ensure lookup is always by uid; csrfToken is single-use and shouldn't be persisted
  const { id: _id, csrfToken: _csrfToken, ...safeBookingData } = bookingData;
  const referenceUid = safeBookingData.seatReferenceUid ?? bookingData.uid;

  // Soft cancel: the cancellation runs from the task queue after a delay so the user can undo it via /api/cancel/undo.
  // Clearing any existing task first lets a repeat request restart the window instead of hitting the unique reference.
  await tasker.cancelWithReference(referenceUid, "cancelBooking");
  await tasker.create(
    "cancelBooking",
    { bookingData: safeBookingData, userId: session?.user?.id || -1 },
    { scheduledAt: new Date(Date.now() + SOFT_CANCEL_DELAY_MS), referenceUid }
  );

  return NextResponse.json({ success: true, scheduled: true }, { status: 200 });
}

export const DELETE = defaultResponderForAppDir(handler);
export const POST = defaultResponderForAppDir(handler);
