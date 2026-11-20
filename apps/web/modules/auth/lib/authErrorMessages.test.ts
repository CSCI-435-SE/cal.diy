import { describe, expect, it } from "vitest";
import type { Translate } from "./authErrorMessages";
import { getAuthErrorPageMessage, getLoginErrorMessage } from "./authErrorMessages";

// Echoes the key (and options) so each test can see exactly which translation was requested.
const t: Translate = (key, options) => (options ? `${key}|${JSON.stringify(options)}` : key);

describe("getLoginErrorMessage", () => {
  it.each([
    ["OAuthSignin", "auth_error_provider_unreachable"],
    ["OAuthCallback", "auth_error_sign_in_failed"],
    ["Callback", "auth_error_sign_in_failed"],
  ])("maps %s to %s", (code, key) => {
    expect(getLoginErrorMessage(t, code)).toBe(key);
  });

  it.each([
    "OAuthCreateAccount",
    "OAuthAccountNotLinked",
    "SomethingNew",
  ])("falls back to the generic message for %s", (code) => {
    expect(getLoginErrorMessage(t, code)).toBe("auth_error_sign_in_generic");
  });

  it("never echoes the raw code, even for names on Object.prototype", () => {
    expect(getLoginErrorMessage(t, "constructor")).toBe("auth_error_sign_in_generic");
    expect(getLoginErrorMessage(t, "<script>alert(1)</script>")).toBe("auth_error_sign_in_generic");
  });

  it.each([null, undefined, ""])("returns null (no alert) when error is %j", (error) => {
    expect(getLoginErrorMessage(t, error)).toBeNull();
  });
});

describe("getAuthErrorPageMessage", () => {
  it.each([
    ["AccessDenied", "auth_error_access_denied"],
    ["missing-email", "auth_error_missing_email"],
    ["oidc-signup-not-allowed", "auth_error_oidc_signup_not_allowed"],
    ["oidc-account-exists", "auth_error_oidc_account_exists"],
    ["unknown-provider", "auth_error_unknown_provider"],
  ])("maps the new code %s to %s", (code, key) => {
    expect(getAuthErrorPageMessage(t, code, undefined)).toBe(key);
  });

  it.each([
    ["user-creation-error", "user_creation_error"],
    ["saml-idp-not-authoritative", "saml_idp_not_authoritative_error"],
    ["unverified-email", "unverified_email_oauth_error"],
  ])("keeps the existing message for %s", (code, key) => {
    expect(getAuthErrorPageMessage(t, code, undefined)).toBe(key);
  });

  it("names OIDC accounts as single sign-on in wrong-provider", () => {
    expect(getAuthErrorPageMessage(t, "wrong-provider", "OIDC")).toBe(
      'account_managed_by_identity_provider_error|{"provider":"single_sign_on"}'
    );
  });

  it.each([
    ["GOOGLE", "Google"],
    ["CAL", "Email and Password"],
    ["SAML", "SAML (like Okta)"],
    ["AZUREAD", "your original login method"],
    [undefined, "your original login method"],
  ])("keeps the existing wrong-provider name for %s", (provider, name) => {
    expect(getAuthErrorPageMessage(t, "wrong-provider", provider)).toBe(
      `account_managed_by_identity_provider_error|${JSON.stringify({ provider: name })}`
    );
  });

  it("keeps the generic message with the error code for unknown codes", () => {
    expect(getAuthErrorPageMessage(t, "new-email-conflict", undefined)).toBe(
      "error_during_login Error code: new-email-conflict"
    );
    expect(getAuthErrorPageMessage(t, "constructor", undefined)).toBe(
      "error_during_login Error code: constructor"
    );
  });

  it("shows the generic message without a code when there is no error", () => {
    expect(getAuthErrorPageMessage(t, undefined, undefined)).toBe("error_during_login");
  });
});
