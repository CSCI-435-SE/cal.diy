import { getWaitlistService } from "@calcom/features/waitlist/services/getWaitlistService";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

async function handler(req: NextRequest) {
  const uid = req.nextUrl.searchParams.get("uid") ?? "";
  const claimUrl = uid ? await getWaitlistService().getClaimUrl(uid) : null;
  if (!claimUrl) {
    return NextResponse.json(
      { success: false, message: "This waitlist offer has expired or was already used." },
      { status: 410 }
    );
  }

  const response = NextResponse.redirect(claimUrl);
  // The slot hold is keyed by the entry uid; the booker identifies its own holds via the `uid` cookie
  const useSecureCookies = WEBAPP_URL.startsWith("https://");
  response.cookies.set("uid", uid, {
    path: "/",
    sameSite: useSecureCookies ? "none" : "lax",
    secure: useSecureCookies,
  });
  return response;
}

export const GET = defaultResponderForAppDir(handler);
