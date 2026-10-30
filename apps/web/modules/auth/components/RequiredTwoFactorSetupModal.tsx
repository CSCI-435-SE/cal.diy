"use client";

import { trpc } from "@calcom/trpc/react";
import EnableTwoFactorModal from "@calcom/web/components/settings/EnableTwoFactorModal";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";

export function RequiredTwoFactorSetupModal() {
  const utils = trpc.useUtils();
  const { data: session, update } = useSession();
  const isRequired = session?.user.requiresTwoFactorSetup === true;

  // 2FA turns on before the backup codes step, so a session refetch at that point (e.g. on window focus)
  // clears the flag while this tab still has to show the codes. Before that step, a cleared flag means
  // setup was finished in another tab or device, or the policy was turned off, so the modal should close.
  const [isShowingBackupCodes, setIsShowingBackupCodes] = useState(false);

  if (!isRequired && !isShowingBackupCodes) return null;

  const handleEnable = async () => {
    if (session?.user.role === "INACTIVE_ADMIN") {
      // Session role is set at login time, so admins need to sign in again to restore it
      signOut({ callbackUrl: "/auth/login" });
      return;
    }
    await update();
    setIsShowingBackupCodes(false);
    utils.viewer.me.invalidate();
  };

  return (
    <EnableTwoFactorModal
      open
      isRequired
      onEnable={handleEnable}
      onBackupCodesShown={() => setIsShowingBackupCodes(true)}
    />
  );
}
