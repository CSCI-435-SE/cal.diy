"use client";

import { REQUIRE_TWO_FACTOR_AUTH_FLAG } from "@calcom/features/flags/config";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { ConfirmationDialogContent, Dialog } from "@calcom/ui/components/dialog";
import { SettingsToggle } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { useState } from "react";

type SecurityViewProps = {
  initialEnabled: boolean;
};

export default function SecurityView({ initialEnabled }: SecurityViewProps) {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [confirmDisableOpen, setConfirmDisableOpen] = useState(false);

  const mutation = trpc.viewer.admin.toggleFeatureFlag.useMutation({
    onSuccess: (feature) => {
      setEnabled(feature.enabled);
      showToast(t("require_2fa_setting_updated"), "success");
      utils.viewer.features.map.invalidate();
      utils.viewer.features.list.invalidate();
    },
    onError: () => {
      showToast(t("require_2fa_setting_update_failed"), "error");
    },
  });

  const handleCheckedChange = (checked: boolean) => {
    if (!checked) {
      setConfirmDisableOpen(true);
      return;
    }
    mutation.mutate({ slug: REQUIRE_TWO_FACTOR_AUTH_FLAG, enabled: true });
  };

  return (
    <>
      <SettingsToggle
        toggleSwitchAtTheEnd
        title={t("require_2fa_for_all_users")}
        description={t("require_2fa_for_all_users_description")}
        checked={enabled}
        disabled={mutation.isPending}
        onCheckedChange={handleCheckedChange}
      />
      <Dialog open={confirmDisableOpen} onOpenChange={setConfirmDisableOpen}>
        <ConfirmationDialogContent
          variety="warning"
          title={t("require_2fa_disable_confirm_title")}
          confirmBtnText={t("require_2fa_disable_confirm_button")}
          isPending={mutation.isPending}
          onConfirm={() => mutation.mutate({ slug: REQUIRE_TWO_FACTOR_AUTH_FLAG, enabled: false })}>
          <p className="mt-2">{t("require_2fa_disable_confirm_description")}</p>
        </ConfirmationDialogContent>
      </Dialog>
    </>
  );
}
