import { describe, expect, it } from "vitest";
import type { OidcProviderForLogin } from "./oidcLoginButtons";
import { getOidcSignInProviderId, toOidcLoginButtons, toOidcSignupButtons } from "./oidcLoginButtons";

// Shaped like #136's OidcProviderPublicDto, including the fields that must never reach the browser.
const acme = {
  id: "cl_acme",
  displayName: "Acme SSO",
  allowSignup: true,
  issuer: "https://acme.example.com",
  clientId: "acme-client",
  scopes: "openid email profile",
  allowedDomains: ["acme.com"],
};
const partner = {
  id: "cl_partner",
  displayName: "Partner Login",
  allowSignup: false,
  issuer: "https://partner.example.com",
  clientId: "partner-client",
  scopes: "openid email",
  allowedDomains: [],
};
const providers: OidcProviderForLogin[] = [acme, partner];

describe("toOidcLoginButtons", () => {
  it("returns one button per provider in the given (admin) order", () => {
    expect(toOidcLoginButtons(providers)).toEqual([
      { id: "cl_acme", displayName: "Acme SSO" },
      { id: "cl_partner", displayName: "Partner Login" },
    ]);
  });

  it("keeps only id and displayName", () => {
    for (const button of toOidcLoginButtons(providers)) {
      expect(Object.keys(button).sort()).toEqual(["displayName", "id"]);
    }
  });

  it("returns no buttons when no provider is enabled", () => {
    expect(toOidcLoginButtons([])).toEqual([]);
  });
});

describe("toOidcSignupButtons", () => {
  it("shows only providers that allow new accounts", () => {
    expect(toOidcSignupButtons(providers, { signupDisabled: false })).toEqual([
      { id: "cl_acme", displayName: "Acme SSO" },
    ]);
  });

  it("keeps the admin order among providers that allow new accounts", () => {
    const second = { ...acme, id: "cl_second", displayName: "Second SSO" };
    expect(toOidcSignupButtons([second, partner, acme], { signupDisabled: false })).toEqual([
      { id: "cl_second", displayName: "Second SSO" },
      { id: "cl_acme", displayName: "Acme SSO" },
    ]);
  });

  it("keeps only id and displayName", () => {
    for (const button of toOidcSignupButtons(providers, { signupDisabled: false })) {
      expect(Object.keys(button).sort()).toEqual(["displayName", "id"]);
    }
  });

  it("shows no buttons when sign-up is disabled site-wide", () => {
    expect(toOidcSignupButtons(providers, { signupDisabled: true })).toEqual([]);
  });

  it("returns no buttons when no provider is enabled", () => {
    expect(toOidcSignupButtons([], { signupDisabled: false })).toEqual([]);
  });
});

describe("getOidcSignInProviderId", () => {
  it("builds the NextAuth provider id oidc-<id>", () => {
    expect(getOidcSignInProviderId("cl_acme")).toBe("oidc-cl_acme");
  });
});
