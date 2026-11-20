import { symmetricEncrypt } from "@calcom/lib/crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  OidcProviderRecord,
  OidcProviderRecordWithEncryptedSecret,
  OidcProviderSource,
} from "./loadOidcNextAuthProviders";
import { emptyOidcProviderSource, loadOidcNextAuthProviders } from "./loadOidcNextAuthProviders";

const { mockWarn } = vi.hoisted(() => ({ mockWarn: vi.fn() }));

vi.mock("@calcom/lib/logger", () => ({
  default: { getSubLogger: () => ({ warn: mockWarn }) },
}));

const KEY = "0123456789abcdef0123456789abcdef";

function record(id: string, displayName = `Provider ${id}`): OidcProviderRecord {
  return {
    id,
    displayName,
    issuer: `https://sso.example.com/realms/${id}`,
    clientId: `client-${id}`,
    scopes: "openid email profile",
  };
}

function withSecret(r: OidcProviderRecord, secret: string): OidcProviderRecordWithEncryptedSecret {
  return { ...r, clientSecretEncrypted: symmetricEncrypt(secret, KEY) };
}

function fakeSource(rows: OidcProviderRecordWithEncryptedSecret[]): OidcProviderSource {
  return {
    findEnabled: vi.fn(async () => rows.map(({ clientSecretEncrypted: _secret, ...rest }) => rest)),
    findByIdWithEncryptedSecret: vi.fn(async (id: string) => rows.find((row) => row.id === id) ?? null),
  };
}

function loggedText(): string {
  return JSON.stringify(mockWarn.mock.calls);
}

describe("loadOidcNextAuthProviders", () => {
  beforeEach(() => {
    mockWarn.mockReset();
  });

  it("returns no providers for the empty source", async () => {
    expect(await loadOidcNextAuthProviders(emptyOidcProviderSource, KEY)).toEqual([]);
    expect(mockWarn).not.toHaveBeenCalled();
  });

  it("builds one provider per enabled record, in the source's order, with the decrypted secret", async () => {
    const source = fakeSource([
      withSecret(record("b", "Beta"), "secret-b"),
      withSecret(record("a", "Alpha"), "secret-a"),
    ]);

    const providers = await loadOidcNextAuthProviders(source, KEY);

    expect(providers.map((p) => [p.id, p.name, p.type])).toEqual([
      ["oidc-b", "Beta", "oauth"],
      ["oidc-a", "Alpha", "oauth"],
    ]);
    expect(providers.map((p) => p.clientSecret)).toEqual(["secret-b", "secret-a"]);
    expect(providers[0].wellKnown).toBe("https://sso.example.com/realms/b/.well-known/openid-configuration");
  });

  it("reads the source again on every call, so changes need no restart", async () => {
    const rows = [withSecret(record("a"), "secret-a")];
    const source = fakeSource(rows);

    expect((await loadOidcNextAuthProviders(source, KEY)).map((p) => p.id)).toEqual(["oidc-a"]);

    rows.push(withSecret(record("b"), "secret-b"));
    expect((await loadOidcNextAuthProviders(source, KEY)).map((p) => p.id)).toEqual(["oidc-a", "oidc-b"]);

    rows.splice(0, 2);
    expect(await loadOidcNextAuthProviders(source, KEY)).toEqual([]);
  });

  it("returns no providers and warns when the source throws", async () => {
    const source: OidcProviderSource = {
      findEnabled: vi.fn().mockRejectedValue(new Error("database is down")),
      findByIdWithEncryptedSecret: vi.fn(),
    };

    expect(await loadOidcNextAuthProviders(source, KEY)).toEqual([]);
    expect(mockWarn).toHaveBeenCalledTimes(1);
    expect(source.findByIdWithEncryptedSecret).not.toHaveBeenCalled();
  });

  it("skips only the provider whose secret cannot be decrypted", async () => {
    const source = fakeSource([
      { ...record("bad"), clientSecretEncrypted: "not-a-valid-ciphertext" },
      withSecret(record("good"), "secret-good"),
    ]);

    const providers = await loadOidcNextAuthProviders(source, KEY);

    expect(providers.map((p) => p.id)).toEqual(["oidc-good"]);
    expect(mockWarn).toHaveBeenCalledWith(expect.any(String), { providerId: "bad" });
  });

  it("skips a provider whose record is gone when its secret is read", async () => {
    const source = fakeSource([withSecret(record("a"), "secret-a"), withSecret(record("b"), "secret-b")]);
    vi.mocked(source.findByIdWithEncryptedSecret).mockImplementationOnce(async () => null);

    const providers = await loadOidcNextAuthProviders(source, KEY);

    expect(providers.map((p) => p.id)).toEqual(["oidc-b"]);
    expect(mockWarn).toHaveBeenCalledWith(expect.any(String), { providerId: "a" });
  });

  it("returns no providers and warns when the encryption key is missing", async () => {
    const source = fakeSource([withSecret(record("a"), "secret-a")]);

    expect(await loadOidcNextAuthProviders(source, undefined)).toEqual([]);
    expect(await loadOidcNextAuthProviders(source, "")).toEqual([]);
    expect(mockWarn).toHaveBeenCalledTimes(2);
    expect(source.findByIdWithEncryptedSecret).not.toHaveBeenCalled();
  });

  it("never logs a secret or its ciphertext", async () => {
    const bad = { ...record("bad"), clientSecretEncrypted: "not-a-valid-ciphertext" };
    const good = withSecret(record("good"), "top-secret-good");

    await loadOidcNextAuthProviders(fakeSource([bad, good]), KEY);
    await loadOidcNextAuthProviders(fakeSource([good]), undefined);

    expect(mockWarn).toHaveBeenCalled();
    const text = loggedText();
    for (const value of ["top-secret-good", bad.clientSecretEncrypted, good.clientSecretEncrypted, KEY]) {
      expect(text).not.toContain(value);
    }
  });
});
