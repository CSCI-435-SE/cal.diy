"use client";

import { trpc } from "@calcom/trpc/react";
import EnableTwoFactorModal from "@calcom/web/components/settings/EnableTwoFactorModal";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export function RequiredTwoFactorSetupModal() {
  const utils = trpc.useUtils();
  const { data: session, update } = useSession();
  const isRequired = session?.user.requiresTwoFactorSetup === true;

  // Stays open once opened, because 2FA is enabled before the backup codes step. A session refetch
  // at that point (e.g. on window focus) clears the flag, which would otherwise hide the codes.
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isRequired) setOpen(true);
  }, [isRequired]);

  if (!open) return null;

  const handleEnable = async () => {
    if (session?.user.role === "INACTIVE_ADMIN") {
      // Session role is set at login time, so admins need to sign in again to restore it
      signOut({ callbackUrl: "/auth/login" });
      return;
    }
    await update();
    setOpen(false);
    utils.viewer.me.invalidate();
  };

  return <EnableTwoFactorModal open isRequired onEnable={handleEnable} />;
}
