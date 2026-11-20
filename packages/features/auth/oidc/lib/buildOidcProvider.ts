import type { User } from "next-auth";
import type { OAuthConfig } from "next-auth/providers/oauth";
import { getOidcNextAuthProviderId } from "./oidcProviderId";

export interface OidcProviderConfig {
  id: string;
  displayName: string;
  issuer: string;
  clientId: string;
  clientSecret: string;
  scopes: string;
}

export interface OidcProfile {
  sub: string;
  name?: string;
  email?: string;
  picture?: string;
}

export function buildOidcProvider(config: OidcProviderConfig): OAuthConfig<OidcProfile> {
  const issuer = config.issuer.replace(/\/+$/, "");

  // No httpOptions: next-auth applies them as process-wide openid-client defaults,
  // which would also change the timeout for Google and Microsoft (design Decision 4).
  // No allowDangerousEmailAccountLinking: an OIDC login must never attach to an
  // existing account by email (#131 criterion 28).
  return {
    id: getOidcNextAuthProviderId(config.id),
    name: config.displayName,
    type: "oauth",
    issuer,
    wellKnown: `${issuer}/.well-known/openid-configuration`,
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    authorization: { params: { scope: config.scopes } },
    idToken: true,
    checks: ["pkce", "state"],
    profile(profile) {
      return {
        // next-auth uses this id as the provider account id (profile.id.toString() in
        // next-auth/core/lib/oauth/callback.js), so it must be the OIDC sub, a string. The app's
        // next-auth augmentation (packages/types/next-auth.d.ts) types User.id as the numeric Cal.diy
        // user id, which does not describe a provider profile.
        id: profile.sub as unknown as User["id"],
        name: profile.name ?? null,
        email: profile.email ?? null,
        image: profile.picture ?? null,
      };
    },
  };
}
