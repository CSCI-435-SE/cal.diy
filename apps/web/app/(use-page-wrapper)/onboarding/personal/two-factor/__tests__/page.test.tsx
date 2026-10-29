import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  findById: vi.fn(),
  requiresTwoFactorSetup: vi.fn(),
  // Next's redirect throws to stop rendering; mirror that so nothing runs after it
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/headers", () => ({ headers: vi.fn(), cookies: vi.fn() }));
vi.mock("@lib/buildLegacyCtx", () => ({ buildLegacyRequest: vi.fn() }));
vi.mock("app/_utils", () => ({ _generateMetadata: vi.fn() }));
vi.mock("@calcom/prisma", () => ({ default: {} }));
vi.mock("@calcom/features/auth/lib/getServerSession", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("@calcom/features/auth/lib/requiresTwoFactorSetup", () => ({
  requiresTwoFactorSetup: mocks.requiresTwoFactorSetup,
}));
vi.mock("@calcom/features/users/repositories/UserRepository", () => ({
  UserRepository: vi.fn().mockImplementation(function () {
    return { findById: mocks.findById };
  }),
}));
vi.mock("@calcom/web/modules/onboarding/personal/two-factor/personal-two-factor-view", () => ({
  PersonalTwoFactorView: () => null,
}));

import ServerPage from "../page";

const user = { id: 1, identityProvider: "CAL", twoFactorEnabled: false };

describe("/onboarding/personal/two-factor page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerSession.mockResolvedValue({ user: { id: 1, email: "user@example.com" } });
    mocks.findById.mockResolvedValue(user);
  });

  it("redirects to login when there is no session", async () => {
    mocks.getServerSession.mockResolvedValue(null);

    await expect(ServerPage()).rejects.toThrow("REDIRECT:/auth/login");
  });

  it("skips the step when 2FA setup isn't required", async () => {
    mocks.requiresTwoFactorSetup.mockResolvedValue(false);

    await expect(ServerPage()).rejects.toThrow("REDIRECT:/onboarding/personal/calendar");
  });

  it("renders the step when the login rule says setup is required", async () => {
    mocks.requiresTwoFactorSetup.mockResolvedValue(true);

    const element = await ServerPage();

    expect(mocks.findById).toHaveBeenCalledWith({ id: 1 });
    expect(mocks.requiresTwoFactorSetup).toHaveBeenCalledWith(user);
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(element.props).toEqual({ userEmail: "user@example.com" });
  });
});
