// Mirrors the fields this file needs from #136's OidcProviderPublicDto (packages/lib/dto/OidcProviderDto.ts).
// Replace with that type once #136 merges.
export type OidcProviderForLogin = {
  id: string;
  displayName: string;
  allowSignup: boolean;
};

export type OidcLoginButton = {
  id: string;
  displayName: string;
};

export type OidcSignInProviderId = `oidc-${string}`;

export function getOidcSignInProviderId(id: string): OidcSignInProviderId {
  return `oidc-${id}`;
}

// Copies only id and displayName: the full DTO also has issuer, clientId, scopes and
// allowedDomains, which must not be serialized into page props sent to the browser.
function toButton(provider: OidcProviderForLogin): OidcLoginButton {
  return { id: provider.id, displayName: provider.displayName };
}

export function toOidcLoginButtons(providers: OidcProviderForLogin[]): OidcLoginButton[] {
  return providers.map(toButton);
}

export function toOidcSignupButtons(
  providers: OidcProviderForLogin[],
  { signupDisabled }: { signupDisabled: boolean }
): OidcLoginButton[] {
  if (signupDisabled) return [];
  return providers.filter((provider) => provider.allowSignup).map(toButton);
}
