import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useSubmitPersonalOnboarding } from "./useSubmitPersonalOnboarding";

export const PERSONAL_TWO_FACTOR_STEP_PATH = "/onboarding/personal/two-factor";

export const getPersonalOnboardingTotalSteps = (requiresTwoFactorSetup: boolean) =>
  requiresTwoFactorSetup ? 3 : 2;

export const useFinishPersonalOnboarding = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const { submitPersonalOnboarding, isSubmitting } = useSubmitPersonalOnboarding();
  const requiresTwoFactorSetup = session?.user.requiresTwoFactorSetup === true;

  const finishPersonalOnboarding = () => {
    // Onboarding is only marked complete after the 2FA step, so it can't be finished without 2FA
    if (requiresTwoFactorSetup) {
      router.push(PERSONAL_TWO_FACTOR_STEP_PATH);
      return;
    }
    submitPersonalOnboarding();
  };

  return {
    finishPersonalOnboarding,
    isSubmitting,
    totalSteps: getPersonalOnboardingTotalSteps(requiresTwoFactorSetup),
  };
};
