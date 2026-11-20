import { symmetricDecrypt } from "@calcom/lib/crypto";
import logger from "@calcom/lib/logger";
import type { OAuthConfig } from "next-auth/providers/oauth";
import type { OidcProfile } from "./buildOidcProvider";
import { buildOidcProvider } from "./buildOidcProvider";

const log = logger.getSubLogger({ prefix: ["auth", "oidc", "loadOidcNextAuthProviders"] });

// Local shapes that match the repository from #136 (findEnabled / findByIdWithEncryptedSecret),
// so that repository can be passed in unchanged once it is merged (design Decision 6).
export interface OidcProviderRecord {
  id: string;
  displayName: string;
  issuer: string;
  clientId: string;
  scopes: string;
}

export interface OidcProviderRecordWithEncryptedSecret extends OidcProviderRecord {
  clientSecretEncrypted: string;
}

export interface OidcProviderSource {
  findEnabled(): Promise<OidcProviderRecord[]>;
  findByIdWithEncryptedSecret(id: string): Promise<OidcProviderRecordWithEncryptedSecret | null>;
}

export const emptyOidcProviderSource: OidcProviderSource = {
  findEnabled: async () => [],
  findByIdWithEncryptedSecret: async () => null,
};

/**
 * Never throws: a failure here would break every sign-in method, so problems are logged
 * and the affected OIDC providers are left out instead.
 */
export async function loadOidcNextAuthProviders(
  source: OidcProviderSource,
  encryptionKey: string | undefined
): Promise<OAuthConfig<OidcProfile>[]> {
  let enabled: OidcProviderRecord[];
  try {
    enabled = await source.findEnabled();
  } catch (error) {
    log.warn("Could not load OIDC providers; continuing without them", {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }

  if (enabled.length === 0) return [];

  if (!encryptionKey) {
    log.warn("CALENDSO_ENCRYPTION_KEY is not set; OIDC providers are disabled", {
      providerIds: enabled.map((provider) => provider.id),
    });
    return [];
  }

  const providers: OAuthConfig<OidcProfile>[] = [];
  for (const { id } of enabled) {
    try {
      const record = await source.findByIdWithEncryptedSecret(id);
      if (!record) {
        log.warn("OIDC provider disappeared while loading; skipping it", { providerId: id });
        continue;
      }
      providers.push(
        buildOidcProvider({
          id: record.id,
          displayName: record.displayName,
          issuer: record.issuer,
          clientId: record.clientId,
          clientSecret: symmetricDecrypt(record.clientSecretEncrypted, encryptionKey),
          scopes: record.scopes,
        })
      );
    } catch {
      // The error is not logged: a decryption error message could include key or ciphertext details.
      log.warn("Could not load OIDC provider secret; skipping it", { providerId: id });
    }
  }
  return providers;
}
