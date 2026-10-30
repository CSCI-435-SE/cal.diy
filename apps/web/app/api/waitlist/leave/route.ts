import { getWaitlistService } from "@calcom/features/waitlist/services/getWaitlistService";
import { getTranslation } from "@calcom/i18n/server";
import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";

const page = (body: string) =>
  new Response(
    `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family:sans-serif;max-width:32rem;margin:4rem auto;padding:0 1rem;text-align:center">${body}</body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );

// GET only shows a confirmation so email link scanners that prefetch URLs can't remove people from the waitlist
async function getHandler() {
  const t = await getTranslation("en", "common");
  return page(
    `<p>${t("waitlist_leave_confirm")}</p><form method="post"><button type="submit" style="padding:.6rem 1rem">${t(
      "waitlist_leave"
    )}</button></form>`
  );
}

async function postHandler(req: NextRequest) {
  const t = await getTranslation("en", "common");
  const uid = req.nextUrl.searchParams.get("uid") ?? "";
  const left = uid ? await getWaitlistService().leave(uid) : false;
  return page(`<p>${t(left ? "waitlist_left" : "waitlist_leave_not_found")}</p>`);
}

export const GET = defaultResponderForAppDir(getHandler);
export const POST = defaultResponderForAppDir(postHandler);
