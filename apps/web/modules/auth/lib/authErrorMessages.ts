import { IdentityProvider } from "@calcom/prisma/enums";

export type Translate = (key: string, options?: Record<string, string>) => string;

// NextAuth sends these codes back to the sign-in page as `?error=`; every other code goes to `/auth/error`.
const LOGIN_ERROR_KEYS = new Map<string, string>([
  ["OAuthSignin", "auth_error_provider_unreachable"],
  ["OAuthCallback", "auth_error_sign_in_failed"],
  ["Callback", "auth_error_sign_in_failed"],
]);

const ERROR_PAGE_KEYS = new Map<string, string>([
  ["user-creation-error", "user_creation_error"],
  ["saml-idp-not-authoritative", "saml_idp_not_authoritative_error"],
  ["unverified-email", "unverified_email_oauth_error"],
  ["AccessDenied", "auth_error_access_denied"],
  ["missing-email", "auth_error_missing_email"],
  ["oidc-signup-not-allowed", "auth_error_oidc_signup_not_allowed"],
  ["oidc-account-exists", "auth_error_oidc_account_exists"],
  ["unknown-provider", "auth_error_unknown_provider"],
]);

// #136 adds OIDC to IdentityProvider; compared as a string so this works before that lands.
const OIDC_IDENTITY_PROVIDER = "OIDC";

export function getLoginErrorMessage(t: Translate, error: string | null | undefined): string | null {
  if (!error) return null;
  return t(LOGIN_ERROR_KEYS.get(error) ?? "auth_error_sign_in_generic");
}

function getProviderName(t: Translate, provider: string | undefined): string {
  switch (provider) {
    case IdentityProvider.GOOGLE:
      return "Google";
    case IdentityProvider.CAL:
      return "Email and Password";
    case IdentityProvider.SAML:
      return "SAML (like Okta)";
    case OIDC_IDENTITY_PROVIDER:
      return t("single_sign_on");
    default:
      return "your original login method";
  }
}

export function getAuthErrorPageMessage(
  t: Translate,
  error: string | undefined,
  provider: string | undefined
): string {
  if (error === "wrong-provider") {
    return t("account_managed_by_identity_provider_error", { provider: getProviderName(t, provider) });
  }
  const key = error ? ERROR_PAGE_KEYS.get(error) : undefined;
  if (key) return t(key);
  return t("error_during_login") + (error ? ` Error code: ${error}` : "");
}
