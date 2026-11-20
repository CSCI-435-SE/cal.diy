import { describe, expect, it } from "vitest";
import type { OidcProviderConfig } from "./buildOidcProvider";
import { buildOidcProvider } from "./buildOidcProvider";

const config: OidcProviderConfig = {
  id: "clx123abc",
  displayName: "Acme SSO",
  issuer: "http://localhost:8080/realms/acme",
  clientId: "cal-diy",
  clientSecret: "plain-secret",
  scopes: "openid email profile",
};

describe("buildOidcProvider", () => {
  it("builds an oauth provider with the oidc-<id> id and the display name", () => {
    const provider = buildOidcProvider(config);

    expect(provider.id).toBe("oidc-clx123abc");
    expect(provider.name).toBe("Acme SSO");
    expect(provider.type).toBe("oauth");
  });

  it("uses OIDC discovery from the issuer", () => {
    const provider = buildOidcProvider(config);

    expect(provider.issuer).toBe("http://localhost:8080/realms/acme");
    expect(provider.wellKnown).toBe("http://localhost:8080/realms/acme/.well-known/openid-configuration");
  });

  it("drops trailing slashes from the issuer before building the discovery URL", () => {
    const provider = buildOidcProvider({ ...config, issuer: "https://sso.example.com/realms/acme//" });

    expect(provider.issuer).toBe("https://sso.example.com/realms/acme");
    expect(provider.wellKnown).toBe("https://sso.example.com/realms/acme/.well-known/openid-configuration");
  });

  it("passes the client credentials and the configured scopes", () => {
    const provider = buildOidcProvider({ ...config, scopes: "openid email" });

    expect(provider.clientId).toBe("cal-diy");
    expect(provider.clientSecret).toBe("plain-secret");
    expect(provider.authorization).toEqual({ params: { scope: "openid email" } });
  });

  it("reads the user from the ID token with PKCE and state checks", () => {
    const provider = buildOidcProvider(config);

    expect(provider.idToken).toBe(true);
    expect(provider.checks).toEqual(["pkce", "state"]);
  });

  it("does not allow linking to an existing account by email", () => {
    const provider = buildOidcProvider(config);

    expect(provider).not.toHaveProperty("allowDangerousEmailAccountLinking");
  });

  it("does not set httpOptions, so other providers keep their timeout", () => {
    const provider = buildOidcProvider(config);

    expect(provider).not.toHaveProperty("httpOptions");
  });

  it("maps the ID token claims to a user, using sub as the id", async () => {
    const provider = buildOidcProvider(config);

    const user = await provider.profile(
      { sub: "kc-user-1", name: "Alex Doe", email: "alex@example.com", picture: "https://img/alex.png" },
      {}
    );

    expect(user).toEqual({
      id: "kc-user-1",
      name: "Alex Doe",
      email: "alex@example.com",
      image: "https://img/alex.png",
    });
  });

  it("maps missing optional claims to null", async () => {
    const provider = buildOidcProvider(config);

    const user = await provider.profile({ sub: "kc-user-2" }, {});

    expect(user).toEqual({ id: "kc-user-2", name: null, email: null, image: null });
  });
});
