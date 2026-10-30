import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PersonalTwoFactorView } from "../personal-two-factor-view";

const mocks = vi.hoisted(() => ({
  calls: [] as string[],
  update: vi.fn(),
  submitPersonalOnboarding: vi.fn(),
  push: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({ update: mocks.update }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({ t: (key: string) => key }),
}));

vi.mock("../../../hooks/useSubmitPersonalOnboarding", () => ({
  useSubmitPersonalOnboarding: () => ({
    submitPersonalOnboarding: mocks.submitPersonalOnboarding,
    isSubmitting: false,
  }),
}));

vi.mock("../../../components/OnboardingLayout", () => ({
  OnboardingLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("../../../components/OnboardingCard", () => ({
  OnboardingCard: ({
    title,
    footer,
    children,
  }: {
    title: string;
    footer: ReactNode;
    children: ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      {children}
      {footer}
    </div>
  ),
}));

// The setup steps themselves are covered by the existing modal; these tests cover the onboarding step around it
vi.mock("@calcom/web/components/settings/EnableTwoFactorModal", () => ({
  default: ({ open, onEnable }: { open: boolean; onEnable: () => void }) =>
    open ? <button onClick={onEnable}>finish setup</button> : null,
}));

describe("PersonalTwoFactorView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.calls = [];
    mocks.update.mockImplementation(async () => {
      mocks.calls.push("update");
    });
    mocks.submitPersonalOnboarding.mockImplementation(() => {
      mocks.calls.push("submit");
    });
  });

  it("offers Back and Enable, but no way to skip 2FA", () => {
    render(<PersonalTwoFactorView userEmail="user@example.com" />);

    expect(screen.getByText("back")).toBeInTheDocument();
    expect(screen.getByTestId("onboarding-enable-2fa-btn")).toBeInTheDocument();
    expect(screen.queryByText("onboarding_skip_for_now")).not.toBeInTheDocument();
  });

  it("opens the setup modal only when the user asks to enable 2FA", () => {
    render(<PersonalTwoFactorView userEmail="user@example.com" />);
    expect(screen.queryByText("finish setup")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("onboarding-enable-2fa-btn"));

    expect(screen.getByText("finish setup")).toBeInTheDocument();
  });

  it("refreshes the session before completing onboarding, so the app-wide popup doesn't open afterwards", async () => {
    render(<PersonalTwoFactorView userEmail="user@example.com" />);
    fireEvent.click(screen.getByTestId("onboarding-enable-2fa-btn"));

    await act(async () => {
      fireEvent.click(screen.getByText("finish setup"));
    });

    expect(mocks.calls).toEqual(["update", "submit"]);
  });
});
