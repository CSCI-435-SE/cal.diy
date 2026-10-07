import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TrpcSessionUser } from "../../../types";
import { discardUnverifiedSignupHandler } from "./discardUnverifiedSignup.handler";

const deleteMany = vi.fn();
vi.mock("@calcom/features/di/containers/UserRepository", () => ({
  getUserRepository: () => ({ deleteMany }),
}));

const makeCtx = (user: { emailVerified: Date | null; createdDate: Date }) => ({
  user: { id: 7, ...user } as NonNullable<TrpcSessionUser>,
});

describe("discardUnverifiedSignupHandler", () => {
  beforeEach(() => deleteMany.mockReset());

  it("deletes a freshly created unverified account", async () => {
    await discardUnverifiedSignupHandler({ ctx: makeCtx({ emailVerified: null, createdDate: new Date() }) });
    expect(deleteMany).toHaveBeenCalledWith({ userIds: [7] });
  });

  it("refuses a verified account", async () => {
    await expect(
      discardUnverifiedSignupHandler({ ctx: makeCtx({ emailVerified: new Date(), createdDate: new Date() }) })
    ).resolves.toEqual({ ok: false });
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it("refuses an old unverified account", async () => {
    const createdDate = new Date(Date.now() - 6 * 60 * 1000);
    await expect(
      discardUnverifiedSignupHandler({ ctx: makeCtx({ emailVerified: null, createdDate }) })
    ).resolves.toEqual({ ok: false });
    expect(deleteMany).not.toHaveBeenCalled();
  });
});
