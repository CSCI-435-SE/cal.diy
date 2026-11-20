import type { NextApiRequest, NextApiResponse } from "next";
import NextAuth from "next-auth";

import { getOptions } from "@calcom/features/auth/lib/next-auth-options";
import {
  emptyOidcProviderSource,
  loadOidcNextAuthProviders,
} from "@calcom/features/auth/oidc/lib/loadOidcNextAuthProviders";
import { getTrackingFromCookies } from "@calcom/lib/tracking";

// pass req to NextAuth: https://github.com/nextauthjs/next-auth/discussions/469
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // Loaded per request so admin changes apply without a restart (ADR-001). The source stays empty
  // until the OIDC provider repository from #136 is merged; then pass getOidcProviderRepository() here.
  const dynamicProviders = await loadOidcNextAuthProviders(
    emptyOidcProviderSource,
    process.env.CALENDSO_ENCRYPTION_KEY
  );

  return NextAuth(
    req,
    res,
    getOptions({
      getDubId: () => req.cookies.dub_id || req.cookies.dclid,
      getTrackingData: () => getTrackingFromCookies(req.cookies, req.query),
      dynamicProviders,
    })
  );
};

export default handler;
