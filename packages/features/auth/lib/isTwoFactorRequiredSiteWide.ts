import { getPrismaFeatureRepository } from "@calcom/features/di/containers/FeatureRepository";
import { REQUIRE_TWO_FACTOR_AUTH_FLAG } from "@calcom/features/flags/config";

export async function isTwoFactorRequiredSiteWide(): Promise<boolean> {
  return getPrismaFeatureRepository().checkIfFeatureIsEnabledGlobally(REQUIRE_TWO_FACTOR_AUTH_FLAG);
}
