import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { Task } from "@calcom/features/tasker/repository";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import getIP from "@calcom/lib/getIP";
import { piiHasher } from "@calcom/lib/server/PiiHasher";
import { validateCsrfToken } from "@calcom/web/lib/validateCsrfToken";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { cookies, headers } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const undoCancelSchema = z.object({
  uid: z.string(),
  seatReferenceUid: z.string().optional(),
  csrfToken: z.string().length(64, "Invalid CSRF token"),
});

async function handler(req: NextRequest) {
  const parsed = undoCancelSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid request" }, { status: 400 });
  }
  const { uid, seatReferenceUid, csrfToken } = parsed.data;

  const csrfError = await validateCsrfToken(csrfToken);
  if (csrfError) {
    return csrfError;
  }

  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  const identifier = session?.user?.id
    ? `api:cancel-user:${session.user.id}`
    : `api:cancel-ip:${piiHasher.hash(getIP(req))}`;
  await checkRateLimitAndThrowError({ rateLimitingType: "core", identifier });

  // Same trust model as /api/cancel: knowing the high-entropy uid is what authorizes the action
  const undone = await Task.cancelPendingWithReference(seatReferenceUid ?? uid, "cancelBooking");
  if (!undone) {
    return NextResponse.json(
      { success: false, message: "No pending cancellation to undo. It may have already been processed." },
      { status: 409 }
    );
  }

  return NextResponse.json({ success: true }, { status: 200 });
}

export const POST = defaultResponderForAppDir(handler);
