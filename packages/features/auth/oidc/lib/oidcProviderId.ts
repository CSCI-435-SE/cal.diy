// Mirrors getOidcAccountProviderId from #136 so this code does not depend on that PR.
// Replace with the repository's helper once #136 is merged.
export const OIDC_PROVIDER_ID_PREFIX = "oidc-";

export function getOidcNextAuthProviderId(id: string): string {
  return `${OIDC_PROVIDER_ID_PREFIX}${id}`;
}

export function isOidcProviderId(provider: string): boolean {
  return provider.startsWith(OIDC_PROVIDER_ID_PREFIX) && provider.length > OIDC_PROVIDER_ID_PREFIX.length;
}
