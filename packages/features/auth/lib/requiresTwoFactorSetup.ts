import { getFeatureRepository } from "@calcom/features/di/containers/FeatureRepository";
import { REQUIRE_TWO_FACTOR_AUTH_FLAG } from "@calcom/features/flags/config";
import { IdentityProvider } from "@calcom/prisma/enums";

export async function requiresTwoFactorSetup(user: {
  identityProvider: IdentityProvider;
  twoFactorEnabled: boolean;
}): Promise<boolean> {
  // Users of external identity providers can't set up 2FA in Cal.diy, so they are exempt
  if (user.identityProvider !== IdentityProvider.CAL || user.twoFactorEnabled) return false;

  // Runs on every session fetch, so it reads the cached flag. Toggling the flag clears that cache entry.
  return getFeatureRepository().checkIfFeatureIsEnabledGlobally(REQUIRE_TWO_FACTOR_AUTH_FLAG);
}
