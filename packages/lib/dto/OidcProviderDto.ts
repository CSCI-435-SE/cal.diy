/** What the login flow may read about an enabled provider. It has no secret. */
export interface OidcProviderPublicDto {
  id: string;
  displayName: string;
  issuer: string;
  clientId: string;
  scopes: string;
  allowSignup: boolean;
  allowedDomains: string[];
}

/** What the admin list shows. It has no secret. */
export interface OidcProviderDto extends OidcProviderPublicDto {
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** The only shape that carries the ciphertext of the client secret. */
export interface OidcProviderWithEncryptedSecretDto extends OidcProviderDto {
  clientSecretEncrypted: string;
}

export interface OidcProviderCreateDto {
  displayName: string;
  issuer: string;
  clientId: string;
  clientSecretEncrypted: string;
  scopes?: string;
  allowSignup?: boolean;
  allowedDomains?: string[];
  enabled?: boolean;
  position?: number;
  updatedById?: number | null;
}

export type OidcProviderUpdateDto = Partial<Omit<OidcProviderCreateDto, "enabled">>;
