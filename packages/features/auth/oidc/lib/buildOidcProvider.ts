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
        id: profile.sub,
        name: profile.name ?? null,
        email: profile.email ?? null,
        image: profile.picture ?? null,
      };
    },
  };
}
