import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { _generateMetadata, getTranslate } from "app/_utils";
import { ShellMainAppDir } from "app/(use-page-wrapper)/(main-nav)/ShellMainAppDir";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import BookingsPeopleView from "~/bookings/views/bookings-people-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("people"),
    (t) => t("people_description"),
    undefined,
    undefined,
    "/bookings/people"
  );

const Page = async () => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (!session?.user?.id) {
    return redirect("/auth/login");
  }

  const t = await getTranslate();

  return (
    <ShellMainAppDir heading={t("people")} subtitle={t("people_description")}>
      <BookingsPeopleView />
    </ShellMainAppDir>
  );
};

export default Page;
