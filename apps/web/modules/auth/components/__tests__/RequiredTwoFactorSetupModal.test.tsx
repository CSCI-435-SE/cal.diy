import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RequiredTwoFactorSetupModal } from "../RequiredTwoFactorSetupModal";

type SessionUser = { requiresTwoFactorSetup?: boolean; role?: string };

const mocks = vi.hoisted(() => ({
  sessionUser: {} as SessionUser,
  update: vi.fn(),
  signOut: vi.fn(),
  invalidateMe: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: mocks.sessionUser }, update: mocks.update }),
  signOut: mocks.signOut,
}));

vi.mock("@calcom/trpc/react", () => ({
  trpc: {
    useUtils: () => ({ viewer: { me: { invalidate: mocks.invalidateMe } } }),
  },
}));

// The setup steps themselves are covered by the existing modal; these tests cover when it shows and closes
vi.mock("@calcom/web/components/settings/EnableTwoFactorModal", () => ({
  default: ({ isRequired, onEnable }: { isRequired?: boolean; onEnable: () => void }) => (
    <div data-testid="enable-2fa-modal" data-required={String(isRequired)}>
      <button onClick={onEnable}>finish setup</button>
    </div>
  ),
}));

const finishSetup = async () => {
  await act(async () => {
    fireEvent.click(screen.getByText("finish setup"));
  });
};

describe("RequiredTwoFactorSetupModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionUser = { requiresTwoFactorSetup: true, role: "USER" };
    mocks.update.mockResolvedValue(null);
  });

  it("renders nothing when setup isn't required", () => {
    mocks.sessionUser = { requiresTwoFactorSetup: false, role: "USER" };

    render(<RequiredTwoFactorSetupModal />);

    expect(screen.queryByTestId("enable-2fa-modal")).not.toBeInTheDocument();
  });

  it("shows the setup modal in required mode when setup is required", () => {
    render(<RequiredTwoFactorSetupModal />);

    expect(screen.getByTestId("enable-2fa-modal")).toHaveAttribute("data-required", "true");
  });

  it("stays open if the session flag clears before the user finishes, so backup codes stay visible", () => {
    const { rerender } = render(<RequiredTwoFactorSetupModal />);

    mocks.sessionUser = { requiresTwoFactorSetup: false, role: "USER" };
    rerender(<RequiredTwoFactorSetupModal />);

    expect(screen.getByTestId("enable-2fa-modal")).toBeInTheDocument();
  });

  it("refreshes the session and closes when setup is finished", async () => {
    render(<RequiredTwoFactorSetupModal />);

    await finishSetup();

    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.invalidateMe).toHaveBeenCalled();
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(screen.queryByTestId("enable-2fa-modal")).not.toBeInTheDocument();
  });

  it("signs inactive admins out instead, since their role is only restored at login", async () => {
    mocks.sessionUser = { requiresTwoFactorSetup: true, role: "INACTIVE_ADMIN" };
    render(<RequiredTwoFactorSetupModal />);

    await finishSetup();

    expect(mocks.signOut).toHaveBeenCalledWith({ callbackUrl: "/auth/login" });
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
