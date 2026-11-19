import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import type { PrismaClient } from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getOidcAccountProviderId, PrismaOidcProviderRepository } from "./PrismaOidcProviderRepository";

const CIPHERTEXT = "iv:ciphertext-of-the-client-secret";

const tx = {
  oidcProvider: { findUnique: vi.fn(), delete: vi.fn() },
  account: { deleteMany: vi.fn() },
};

const prismaMock = {
  oidcProvider: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  account: { findMany: vi.fn() },
  $transaction: vi.fn(),
};

const repository = new PrismaOidcProviderRepository(prismaMock as unknown as PrismaClient);

function prismaError(code: string, message: string) {
  return new Prisma.PrismaClientKnownRequestError(message, { code, clientVersion: "test" });
}

const adminRow = {
  id: "prov_1",
  displayName: "Keycloak",
  issuer: "https://idp.example.com/realms/cal",
  clientId: "cal-diy",
  scopes: "openid email profile",
  allowSignup: false,
  allowedDomains: [],
  enabled: false,
  createdAt: new Date("2026-11-19T00:00:00Z"),
  updatedAt: new Date("2026-11-19T00:00:00Z"),
};

beforeEach(() => {
  vi.resetAllMocks();
  // Runs the callback against the transaction client, as Prisma does. A throw inside
  // the callback rejects the whole call, which is how Prisma rolls back.
  prismaMock.$transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<void>) =>
    callback(tx)
  );
});

describe("PrismaOidcProviderRepository", () => {
  describe("findEnabled (criterion 5)", () => {
    it("asks only for enabled providers, by position and then createdAt", async () => {
      prismaMock.oidcProvider.findMany.mockResolvedValue([]);

      await repository.findEnabled();

      const args = prismaMock.oidcProvider.findMany.mock.calls[0][0];
      expect(args.where).toEqual({ enabled: true });
      expect(args.orderBy).toEqual([{ position: "asc" }, { createdAt: "asc" }]);
    });

    it("selects the public fields and never the secret", async () => {
      prismaMock.oidcProvider.findMany.mockResolvedValue([]);

      await repository.findEnabled();

      const { select } = prismaMock.oidcProvider.findMany.mock.calls[0][0];
      expect(Object.keys(select).sort()).toEqual(
        ["allowSignup", "allowedDomains", "clientId", "displayName", "id", "issuer", "scopes"].sort()
      );
      expect(select).not.toHaveProperty("clientSecretEncrypted");
    });
  });

  describe("list (criterion 6)", () => {
    it("asks for every provider in the same order", async () => {
      prismaMock.oidcProvider.findMany.mockResolvedValue([adminRow]);

      const result = await repository.list();

      const args = prismaMock.oidcProvider.findMany.mock.calls[0][0];
      expect(args.where).toBeUndefined();
      expect(args.orderBy).toEqual([{ position: "asc" }, { createdAt: "asc" }]);
      expect(result).toEqual([adminRow]);
    });

    it("selects the public fields plus enabled, createdAt and updatedAt, and never the secret", async () => {
      prismaMock.oidcProvider.findMany.mockResolvedValue([]);

      await repository.list();

      const { select } = prismaMock.oidcProvider.findMany.mock.calls[0][0];
      expect(Object.keys(select).sort()).toEqual(
        [
          "allowSignup",
          "allowedDomains",
          "clientId",
          "createdAt",
          "displayName",
          "enabled",
          "id",
          "issuer",
          "scopes",
          "updatedAt",
        ].sort()
      );
      expect(select).not.toHaveProperty("clientSecretEncrypted");
    });
  });

  describe("findByIdWithEncryptedSecret (criterion 7)", () => {
    it("returns the ciphertext for a known id", async () => {
      prismaMock.oidcProvider.findUnique.mockResolvedValue({
        ...adminRow,
        clientSecretEncrypted: CIPHERTEXT,
      });

      const result = await repository.findByIdWithEncryptedSecret("prov_1");

      const args = prismaMock.oidcProvider.findUnique.mock.calls[0][0];
      expect(args.where).toEqual({ id: "prov_1" });
      expect(args.select.clientSecretEncrypted).toBe(true);
      expect(result?.clientSecretEncrypted).toBe(CIPHERTEXT);
    });

    it("returns null for an unknown id", async () => {
      prismaMock.oidcProvider.findUnique.mockResolvedValue(null);

      await expect(repository.findByIdWithEncryptedSecret("missing")).resolves.toBeNull();
    });
  });

  describe("create (criteria 3 and 8)", () => {
    const input = {
      displayName: "Keycloak",
      issuer: "https://idp.example.com/realms/cal",
      clientId: "cal-diy",
      clientSecretEncrypted: CIPHERTEXT,
    };

    it("writes only the fields it is given and returns no secret", async () => {
      prismaMock.oidcProvider.create.mockResolvedValue(adminRow);

      const result = await repository.create(input);

      const args = prismaMock.oidcProvider.create.mock.calls[0][0];
      expect(args.data).toEqual(input);
      expect(args.select).not.toHaveProperty("clientSecretEncrypted");
      expect(result).toEqual(adminRow);
    });

    it("turns a duplicate issuer and client ID into an error that names the issuer and not the secret", async () => {
      // Prisma prints the failed write in its message, so the raw error holds the ciphertext.
      prismaMock.oidcProvider.create.mockRejectedValue(
        prismaError("P2002", `Unique constraint failed. data: { clientSecretEncrypted: "${CIPHERTEXT}" }`)
      );

      const error = await repository.create(input).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ErrorWithCode);
      expect((error as ErrorWithCode).code).toBe(ErrorCode.BadRequest);
      expect((error as ErrorWithCode).message).toContain("https://idp.example.com/realms/cal");
      expect((error as ErrorWithCode).message).not.toContain(CIPHERTEXT);
    });

    it("passes an error that is not a unique-constraint error through unchanged", async () => {
      const dbDown = prismaError("P1001", "Can't reach database server");
      prismaMock.oidcProvider.create.mockRejectedValue(dbDown);

      await expect(repository.create(input)).rejects.toBe(dbDown);
    });
  });

  describe("update (criterion 8)", () => {
    it("leaves the secret unchanged when no new secret is given", async () => {
      prismaMock.oidcProvider.update.mockResolvedValue({ ...adminRow, displayName: "Company SSO" });

      await repository.update("prov_1", { displayName: "Company SSO" });

      const args = prismaMock.oidcProvider.update.mock.calls[0][0];
      expect(args.where).toEqual({ id: "prov_1" });
      expect(args.data).toEqual({ displayName: "Company SSO" });
      expect(args.data).not.toHaveProperty("clientSecretEncrypted");
      expect(args.select).not.toHaveProperty("clientSecretEncrypted");
    });

    it("writes a new secret when one is given", async () => {
      prismaMock.oidcProvider.update.mockResolvedValue(adminRow);

      await repository.update("prov_1", { clientSecretEncrypted: "iv:new-ciphertext" });

      expect(prismaMock.oidcProvider.update.mock.calls[0][0].data).toEqual({
        clientSecretEncrypted: "iv:new-ciphertext",
      });
    });

    it("turns a duplicate issuer and client ID into a BadRequest error", async () => {
      prismaMock.oidcProvider.update.mockRejectedValue(prismaError("P2002", "Unique constraint failed"));

      const error = await repository
        .update("prov_1", { issuer: "https://other.example.com" })
        .catch((e: unknown) => e);

      expect((error as ErrorWithCode).code).toBe(ErrorCode.BadRequest);
      expect((error as ErrorWithCode).message).toContain("https://other.example.com");
    });

    it("turns an unknown id into a NotFound error", async () => {
      prismaMock.oidcProvider.update.mockRejectedValue(prismaError("P2025", "Record to update not found"));

      const error = await repository.update("missing", { displayName: "x" }).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ErrorWithCode);
      expect((error as ErrorWithCode).code).toBe(ErrorCode.NotFound);
    });
  });

  describe("setEnabled (criterion 8)", () => {
    it.each([true, false])("writes only enabled = %s", async (enabled) => {
      prismaMock.oidcProvider.update.mockResolvedValue({ ...adminRow, enabled });

      const result = await repository.setEnabled("prov_1", enabled);

      const args = prismaMock.oidcProvider.update.mock.calls[0][0];
      expect(args.where).toEqual({ id: "prov_1" });
      expect(args.data).toEqual({ enabled });
      expect(args.select).not.toHaveProperty("clientSecretEncrypted");
      expect(result.enabled).toBe(enabled);
    });

    it("turns an unknown id into a NotFound error", async () => {
      prismaMock.oidcProvider.update.mockRejectedValue(prismaError("P2025", "Record to update not found"));

      const error = await repository.setEnabled("missing", true).catch((e: unknown) => e);

      expect((error as ErrorWithCode).code).toBe(ErrorCode.NotFound);
    });
  });

  describe("countLinkedAccounts (criterion 9)", () => {
    it("counts distinct users whose account provider is oidc-<id>", async () => {
      // The database applies `distinct`, so two rows back means two users.
      prismaMock.account.findMany.mockResolvedValue([{ userId: 7 }, { userId: 9 }]);

      const count = await repository.countLinkedAccounts("prov_1");

      const args = prismaMock.account.findMany.mock.calls[0][0];
      expect(args.where).toEqual({ provider: "oidc-prov_1" });
      expect(args.distinct).toEqual(["userId"]);
      expect(count).toBe(2);
    });

    it("returns 0 when no user is linked", async () => {
      prismaMock.account.findMany.mockResolvedValue([]);

      await expect(repository.countLinkedAccounts("prov_1")).resolves.toBe(0);
    });
  });

  describe("deleteWithAccounts (criterion 10)", () => {
    it("deletes the linked accounts and the provider inside one transaction", async () => {
      tx.oidcProvider.findUnique.mockResolvedValue({ id: "prov_1" });

      await repository.deleteWithAccounts("prov_1");

      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.account.deleteMany).toHaveBeenCalledWith({ where: { provider: "oidc-prov_1" } });
      expect(tx.oidcProvider.delete).toHaveBeenCalledWith({ where: { id: "prov_1" } });
    });

    it("throws NotFound and deletes nothing for an unknown id", async () => {
      tx.oidcProvider.findUnique.mockResolvedValue(null);

      const error = await repository.deleteWithAccounts("missing").catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ErrorWithCode);
      expect((error as ErrorWithCode).code).toBe(ErrorCode.NotFound);
      expect(tx.account.deleteMany).not.toHaveBeenCalled();
      expect(tx.oidcProvider.delete).not.toHaveBeenCalled();
    });

    it("rejects the transaction when the account delete fails, so the provider is kept", async () => {
      tx.oidcProvider.findUnique.mockResolvedValue({ id: "prov_1" });
      const failure = new Error("account delete failed");
      tx.account.deleteMany.mockRejectedValue(failure);

      await expect(repository.deleteWithAccounts("prov_1")).rejects.toBe(failure);
      expect(tx.oidcProvider.delete).not.toHaveBeenCalled();
    });

    it("rejects the transaction when the provider delete fails", async () => {
      tx.oidcProvider.findUnique.mockResolvedValue({ id: "prov_1" });
      const failure = new Error("provider delete failed");
      tx.oidcProvider.delete.mockRejectedValue(failure);

      await expect(repository.deleteWithAccounts("prov_1")).rejects.toBe(failure);
    });
  });

  it("builds the account provider id as oidc-<id>", () => {
    expect(getOidcAccountProviderId("abc")).toBe("oidc-abc");
  });
});
