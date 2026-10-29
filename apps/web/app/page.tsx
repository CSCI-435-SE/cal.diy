import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { checkOnboardingRedirect } from "@calcom/features/auth/lib/onboardingUtils";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { getUserRepository } from "@calcom/features/di/containers/UserRepository";
import { getDefaultLandingPagePath } from "@calcom/lib/defaultLandingPage";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

const RedirectPage = async () => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  // Check if user needs onboarding and redirect before going to their landing page
  const organizationId = session.user.profile?.organizationId ?? null;
  const onboardingPath = await checkOnboardingRedirect(session.user.id, {
    checkEmailVerification: true,
    organizationId,
  });
  if (onboardingPath) {
    redirect(onboardingPath);
  }

  const user = await getUserRepository().findMetadataById({ id: session.user.id });
  redirect(getDefaultLandingPagePath(user?.metadata));
};

export default RedirectPage;
