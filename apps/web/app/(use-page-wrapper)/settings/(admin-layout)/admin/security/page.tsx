import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { isTwoFactorRequiredSiteWide } from "@calcom/features/auth/lib/isTwoFactorRequiredSiteWide";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { UserPermissionRole } from "@calcom/prisma/enums";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { _generateMetadata, getTranslate } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import SecurityView from "~/settings/admin/security-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("security"),
    (t) => t("admin_security_description"),
    undefined,
    undefined,
    "/settings/admin/security"
  );

const Page = async () => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (session?.user?.role !== UserPermissionRole.ADMIN) {
    return redirect("/settings/my-account/profile");
  }

  const t = await getTranslate();
  const requireTwoFactorAuth = await isTwoFactorRequiredSiteWide();

  return (
    <SettingsHeader title={t("security")} description={t("admin_security_description")}>
      <SecurityView initialEnabled={requireTwoFactorAuth} />
    </SettingsHeader>
  );
};

export default Page;
