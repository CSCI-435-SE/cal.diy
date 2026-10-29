import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUserSession: vi.fn(),
  handler: vi.fn(),
}));

vi.mock("@calcom/features/auth/lib/userFromSessionUtils", () => ({
  getUserSession: mocks.getUserSession,
}));
vi.mock("@sentry/nextjs", () => ({
  setUser: vi.fn(),
}));
vi.mock("./toggleFeatureFlag.handler", () => ({
  default: mocks.handler,
}));

import { createCallerFactory, router } from "../../../trpc";
import { toggleFeatureFlag } from "./toggleFeatureFlag.procedure";

const createCaller = createCallerFactory(router({ toggleFeatureFlag }));
type CallerContext = Parameters<typeof createCaller>[0];

const loginAs = (role: "ADMIN" | "USER") => {
  mocks.getUserSession.mockResolvedValue({ user: { id: 1, role }, session: { user: { id: 1 } } });
};

const toggleRequireTwoFactorAuth = () =>
  createCaller({ locale: "en" } as unknown as CallerContext).toggleFeatureFlag({
    slug: "require-two-factor-auth",
    enabled: true,
  });

describe("admin.toggleFeatureFlag", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.handler.mockResolvedValue({ slug: "require-two-factor-auth", enabled: true });
  });

  it("rejects a non-admin user without changing the flag", async () => {
    loginAs("USER");

    await expect(toggleRequireTwoFactorAuth()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(mocks.handler).not.toHaveBeenCalled();
  });

  it("rejects a request with no logged-in user", async () => {
    mocks.getUserSession.mockResolvedValue({ user: null, session: null });

    await expect(toggleRequireTwoFactorAuth()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(mocks.handler).not.toHaveBeenCalled();
  });

  it("lets an admin change the flag", async () => {
    loginAs("ADMIN");

    await expect(toggleRequireTwoFactorAuth()).resolves.toEqual({
      slug: "require-two-factor-auth",
      enabled: true,
    });
    expect(mocks.handler).toHaveBeenCalledWith(
      expect.objectContaining({ input: { slug: "require-two-factor-auth", enabled: true } })
    );
  });
});
