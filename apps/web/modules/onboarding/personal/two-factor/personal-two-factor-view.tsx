"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import EnableTwoFactorModal from "@calcom/web/components/settings/EnableTwoFactorModal";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { OnboardingCard } from "../../components/OnboardingCard";
import { OnboardingLayout } from "../../components/OnboardingLayout";
import { useSubmitPersonalOnboarding } from "../../hooks/useSubmitPersonalOnboarding";

type PersonalTwoFactorViewProps = {
  userEmail: string;
};

export const PersonalTwoFactorView = ({ userEmail }: PersonalTwoFactorViewProps) => {
  const router = useRouter();
  const { t } = useLocale();
  const { update } = useSession();
  const { submitPersonalOnboarding, isSubmitting } = useSubmitPersonalOnboarding();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleEnable = async () => {
    setIsModalOpen(false);
    // Clear the session flag before onboarding redirects into the app, or the app-wide setup popup would open
    await update();
    submitPersonalOnboarding();
  };

  return (
    <OnboardingLayout userEmail={userEmail} currentStep={3} totalSteps={3}>
      <OnboardingCard
        title={t("require_2fa_onboarding_title")}
        subtitle={t("require_2fa_onboarding_subtitle")}
        footer={
          <div className="flex w-full items-center justify-between gap-4">
            <Button
              color="minimal"
              className="rounded-[10px]"
              onClick={() => router.push("/onboarding/personal/calendar")}
              disabled={isSubmitting}>
              {t("back")}
            </Button>
            <Button
              data-testid="onboarding-enable-2fa-btn"
              color="primary"
              className="rounded-[10px]"
              onClick={() => setIsModalOpen(true)}
              loading={isSubmitting}
              disabled={isSubmitting}>
              {t("enable_2fa")}
            </Button>
          </div>
        }>
        <EnableTwoFactorModal
          open={isModalOpen}
          onOpenChange={() => setIsModalOpen(!isModalOpen)}
          onCancel={() => setIsModalOpen(false)}
          onEnable={handleEnable}
        />
      </OnboardingCard>
    </OnboardingLayout>
  );
};
