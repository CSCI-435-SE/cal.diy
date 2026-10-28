import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCheckIfFeatureIsEnabledGlobally, mockGetFeatureRepository } = vi.hoisted(() => ({
  mockCheckIfFeatureIsEnabledGlobally: vi.fn(),
  mockGetFeatureRepository: vi.fn(),
}));

vi.mock("@calcom/features/di/containers/FeatureRepository", () => ({
  getPrismaFeatureRepository: () => ({
    checkIfFeatureIsEnabledGlobally: mockCheckIfFeatureIsEnabledGlobally,
  }),
  getFeatureRepository: mockGetFeatureRepository,
}));

import { isTwoFactorRequiredSiteWide } from "./isTwoFactorRequiredSiteWide";

describe("isTwoFactorRequiredSiteWide", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when the require-two-factor-auth flag is enabled", async () => {
    mockCheckIfFeatureIsEnabledGlobally.mockResolvedValue(true);

    await expect(isTwoFactorRequiredSiteWide()).resolves.toBe(true);
    expect(mockCheckIfFeatureIsEnabledGlobally).toHaveBeenCalledWith("require-two-factor-auth");
  });

  it("returns false when the flag is disabled", async () => {
    mockCheckIfFeatureIsEnabledGlobally.mockResolvedValue(false);

    await expect(isTwoFactorRequiredSiteWide()).resolves.toBe(false);
  });

  it("reads from the uncached repository, never the cached one", async () => {
    mockCheckIfFeatureIsEnabledGlobally.mockResolvedValue(true);

    await isTwoFactorRequiredSiteWide();

    expect(mockGetFeatureRepository).not.toHaveBeenCalled();
  });

  it("propagates database errors instead of treating them as not required", async () => {
    mockCheckIfFeatureIsEnabledGlobally.mockRejectedValue(new Error("connection lost"));

    await expect(isTwoFactorRequiredSiteWide()).rejects.toThrow("connection lost");
  });
});
