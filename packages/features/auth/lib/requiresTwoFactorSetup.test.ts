import { IdentityProvider } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCheckIfFeatureIsEnabledGlobally, mockGetPrismaFeatureRepository } = vi.hoisted(() => ({
  mockCheckIfFeatureIsEnabledGlobally: vi.fn(),
  mockGetPrismaFeatureRepository: vi.fn(),
}));

vi.mock("@calcom/features/di/containers/FeatureRepository", () => ({
  getFeatureRepository: () => ({
    checkIfFeatureIsEnabledGlobally: mockCheckIfFeatureIsEnabledGlobally,
  }),
  getPrismaFeatureRepository: mockGetPrismaFeatureRepository,
}));

import { requiresTwoFactorSetup } from "./requiresTwoFactorSetup";

const passwordUserWithout2FA = { identityProvider: IdentityProvider.CAL, twoFactorEnabled: false };

describe("requiresTwoFactorSetup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when the setting is on, the user has no 2FA, and the user signs in with a password", async () => {
    mockCheckIfFeatureIsEnabledGlobally.mockResolvedValue(true);

    await expect(requiresTwoFactorSetup(passwordUserWithout2FA)).resolves.toBe(true);
    expect(mockCheckIfFeatureIsEnabledGlobally).toHaveBeenCalledWith("require-two-factor-auth");
  });

  it("returns false when the setting is off", async () => {
    mockCheckIfFeatureIsEnabledGlobally.mockResolvedValue(false);

    await expect(requiresTwoFactorSetup(passwordUserWithout2FA)).resolves.toBe(false);
  });

  it("returns false without reading the setting when the user already has 2FA", async () => {
    mockCheckIfFeatureIsEnabledGlobally.mockResolvedValue(true);

    await expect(
      requiresTwoFactorSetup({ identityProvider: IdentityProvider.CAL, twoFactorEnabled: true })
    ).resolves.toBe(false);
    expect(mockCheckIfFeatureIsEnabledGlobally).not.toHaveBeenCalled();
  });

  it.each([
    IdentityProvider.GOOGLE,
    IdentityProvider.SAML,
    IdentityProvider.AZUREAD,
  ])("returns false without reading the setting for %s users", async (identityProvider) => {
    mockCheckIfFeatureIsEnabledGlobally.mockResolvedValue(true);

    await expect(requiresTwoFactorSetup({ identityProvider, twoFactorEnabled: false })).resolves.toBe(false);
    expect(mockCheckIfFeatureIsEnabledGlobally).not.toHaveBeenCalled();
  });

  it("reads from the cached repository, because it runs on every session fetch", async () => {
    mockCheckIfFeatureIsEnabledGlobally.mockResolvedValue(true);

    await requiresTwoFactorSetup(passwordUserWithout2FA);

    expect(mockGetPrismaFeatureRepository).not.toHaveBeenCalled();
  });
});
