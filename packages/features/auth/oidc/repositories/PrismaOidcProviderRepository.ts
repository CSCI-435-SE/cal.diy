import type {
  OidcProviderCreateDto,
  OidcProviderDto,
  OidcProviderPublicDto,
  OidcProviderUpdateDto,
  OidcProviderWithEncryptedSecretDto,
} from "@calcom/lib/dto/OidcProviderDto";
import { ErrorWithCode } from "@calcom/lib/errors";
import type { PrismaClient } from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";

const publicSelect = {
  id: true,
  displayName: true,
  issuer: true,
  clientId: true,
  scopes: true,
  allowSignup: true,
  allowedDomains: true,
} satisfies Prisma.OidcProviderSelect;

const adminSelect = {
  ...publicSelect,
  enabled: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.OidcProviderSelect;

const displayOrder: Prisma.OidcProviderOrderByWithRelationInput[] = [
  { position: "asc" },
  { createdAt: "asc" },
];

function isPrismaError(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

/** The value of `Account.provider` for a user linked to this provider (ADR-002). */
export function getOidcAccountProviderId(id: string): string {
  return `oidc-${id}`;
}

export class PrismaOidcProviderRepository {
  constructor(private prismaClient: PrismaClient) {}

  async findEnabled(): Promise<OidcProviderPublicDto[]> {
    return this.prismaClient.oidcProvider.findMany({
      where: { enabled: true },
      orderBy: displayOrder,
      select: publicSelect,
    });
  }

  async list(): Promise<OidcProviderDto[]> {
    return this.prismaClient.oidcProvider.findMany({
      orderBy: displayOrder,
      select: adminSelect,
    });
  }

  async findByIdWithEncryptedSecret(id: string): Promise<OidcProviderWithEncryptedSecretDto | null> {
    return this.prismaClient.oidcProvider.findUnique({
      where: { id },
      select: { ...adminSelect, clientSecretEncrypted: true },
    });
  }

  async create(data: OidcProviderCreateDto): Promise<OidcProviderDto> {
    try {
      return await this.prismaClient.oidcProvider.create({ data, select: adminSelect });
    } catch (error) {
      throw this.toRepositoryError(error, { issuer: data.issuer });
    }
  }

  async update(id: string, data: OidcProviderUpdateDto): Promise<OidcProviderDto> {
    try {
      return await this.prismaClient.oidcProvider.update({ where: { id }, data, select: adminSelect });
    } catch (error) {
      throw this.toRepositoryError(error, { id, issuer: data.issuer });
    }
  }

  async setEnabled(id: string, enabled: boolean): Promise<OidcProviderDto> {
    try {
      return await this.prismaClient.oidcProvider.update({
        where: { id },
        data: { enabled },
        select: adminSelect,
      });
    } catch (error) {
      throw this.toRepositoryError(error, { id });
    }
  }

  async countLinkedAccounts(id: string): Promise<number> {
    // One user can hold two accounts at the same provider, so rows are not users.
    const users = await this.prismaClient.account.findMany({
      where: { provider: getOidcAccountProviderId(id) },
      distinct: ["userId"],
      select: { userId: true },
    });
    return users.length;
  }

  async deleteWithAccounts(id: string): Promise<void> {
    await this.prismaClient.$transaction(async (tx) => {
      const provider = await tx.oidcProvider.findUnique({ where: { id }, select: { id: true } });
      if (!provider) {
        throw ErrorWithCode.Factory.NotFound(`OIDC provider ${id} not found`);
      }
      await tx.account.deleteMany({ where: { provider: getOidcAccountProviderId(id) } });
      await tx.oidcProvider.delete({ where: { id } });
    });
  }

  // The message is built from the id and the issuer only. A Prisma error can print the
  // values of the failed write, and those include the ciphertext of the secret.
  private toRepositoryError(error: unknown, context: { id?: string; issuer?: string }): unknown {
    if (isPrismaError(error, "P2002")) {
      const issuer = context.issuer ? ` ${context.issuer}` : "";
      return ErrorWithCode.Factory.BadRequest(
        `An OIDC provider with the issuer${issuer} and this client ID already exists`
      );
    }
    if (isPrismaError(error, "P2025") && context.id) {
      return ErrorWithCode.Factory.NotFound(`OIDC provider ${context.id} not found`);
    }
    return error;
  }
}
