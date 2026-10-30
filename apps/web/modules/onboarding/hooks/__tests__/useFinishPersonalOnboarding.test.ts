import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERSONAL_TWO_FACTOR_STEP_PATH, useFinishPersonalOnboarding } from "../useFinishPersonalOnboarding";

const mocks = vi.hoisted(() => ({
  requiresTwoFactorSetup: false,
  push: vi.fn(),
  submitPersonalOnboarding: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { requiresTwoFactorSetup: mocks.requiresTwoFactorSetup } } }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock("../useSubmitPersonalOnboarding", () => ({
  useSubmitPersonalOnboarding: () => ({
    submitPersonalOnboarding: mocks.submitPersonalOnboarding,
    isSubmitting: false,
  }),
}));

describe("useFinishPersonalOnboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submits onboarding as before when 2FA setup isn't required", () => {
    mocks.requiresTwoFactorSetup = false;
    const { result } = renderHook(() => useFinishPersonalOnboarding());

    result.current.finishPersonalOnboarding();

    expect(mocks.submitPersonalOnboarding).toHaveBeenCalledTimes(1);
    expect(mocks.push).not.toHaveBeenCalled();
    expect(result.current.totalSteps).toBe(2);
  });

  it("goes to the 2FA step instead of completing onboarding when setup is required", () => {
    mocks.requiresTwoFactorSetup = true;
    const { result } = renderHook(() => useFinishPersonalOnboarding());

    result.current.finishPersonalOnboarding();

    expect(mocks.push).toHaveBeenCalledWith(PERSONAL_TWO_FACTOR_STEP_PATH);
    expect(mocks.submitPersonalOnboarding).not.toHaveBeenCalled();
    expect(result.current.totalSteps).toBe(3);
  });
});
