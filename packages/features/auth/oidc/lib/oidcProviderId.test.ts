import { describe, expect, it } from "vitest";
import { getOidcNextAuthProviderId, isOidcProviderId, OIDC_PROVIDER_ID_PREFIX } from "./oidcProviderId";

describe("getOidcNextAuthProviderId", () => {
  it("prefixes the provider id with oidc-", () => {
    expect(OIDC_PROVIDER_ID_PREFIX).toBe("oidc-");
    expect(getOidcNextAuthProviderId("clx123abc")).toBe("oidc-clx123abc");
  });
});

describe("isOidcProviderId", () => {
  it.each(["oidc-clx123abc", "oidc-1"])("accepts %s", (provider) => {
    expect(isOidcProviderId(provider)).toBe(true);
  });

  it.each([
    "oidc-",
    "oidc",
    "google",
    "azure-ad",
    "saml-idp",
    "cal",
    "xoidc-1",
    "OIDC-1",
    "",
  ])("rejects %j", (provider) => {
    expect(isOidcProviderId(provider)).toBe(false);
  });

  it("accepts every id built by getOidcNextAuthProviderId", () => {
    expect(isOidcProviderId(getOidcNextAuthProviderId("abc"))).toBe(true);
  });
});
