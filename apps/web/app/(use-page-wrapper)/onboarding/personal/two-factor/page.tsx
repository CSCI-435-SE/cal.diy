import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { requiresTwoFactorSetup } from "@calcom/features/auth/lib/requiresTwoFactorSetup";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { APP_NAME } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";
import { PersonalTwoFactorView } from "@calcom/web/modules/onboarding/personal/two-factor/personal-two-factor-view";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => `${APP_NAME} - ${t("two_factor_auth")}`,
    () => "",
    true,
    undefined,
    "/onboarding/personal/two-factor"
  );
};

const ServerPage = async () => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  if (!session?.user?.id) {
    return redirect("/auth/login");
  }

  const user = await new UserRepository(prisma).findById({ id: session.user.id });

  if (!user) {
    return redirect("/auth/login");
  }

  // The session's copy of the flag isn't available to server pages, so ask the same rule login uses
  if (!(await requiresTwoFactorSetup(user))) {
    return redirect("/onboarding/personal/calendar");
  }

  return <PersonalTwoFactorView userEmail={session.user.email || ""} />;
};

export default ServerPage;
