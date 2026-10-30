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
  default: ({
    isRequired,
    onEnable,
    onBackupCodesShown,
  }: {
    isRequired?: boolean;
    onEnable: () => void;
    onBackupCodesShown?: () => void;
  }) => (
    <div data-testid="enable-2fa-modal" data-required={String(isRequired)}>
      <button onClick={onBackupCodesShown}>verify code</button>
      <button onClick={onEnable}>finish setup</button>
    </div>
  ),
}));

// Stands in for next-auth refetching the session, which it does on window focus and when another tab calls update()
const refetchSession = (sessionUser: SessionUser, rerender: (ui: JSX.Element) => void) => {
  mocks.sessionUser = sessionUser;
  rerender(<RequiredTwoFactorSetupModal />);
};

const finishSetup = async () => {
  await act(async () => {
    fireEvent.click(screen.getByText("finish setup"));
  });
};

describe("RequiredTwoFactorSetupModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionUser = { requiresTwoFactorSetup: true, role: "USER" };
    mocks.update.mockImplementation(async () => {
      mocks.sessionUser = { ...mocks.sessionUser, requiresTwoFactorSetup: false };
      return null;
    });
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

  it("stays open after this tab enables 2FA and the flag clears, so backup codes stay visible", () => {
    const { rerender } = render(<RequiredTwoFactorSetupModal />);

    fireEvent.click(screen.getByText("verify code"));
    refetchSession({ requiresTwoFactorSetup: false, role: "USER" }, rerender);

    expect(screen.getByTestId("enable-2fa-modal")).toBeInTheDocument();
  });

  it("closes when setup is finished in another tab before this tab verifies a code", () => {
    const { rerender } = render(<RequiredTwoFactorSetupModal />);

    refetchSession({ requiresTwoFactorSetup: false, role: "USER" }, rerender);

    expect(screen.queryByTestId("enable-2fa-modal")).not.toBeInTheDocument();
  });

  it("reopens if the requirement comes back, e.g. after 2FA is disabled elsewhere", () => {
    const { rerender } = render(<RequiredTwoFactorSetupModal />);

    refetchSession({ requiresTwoFactorSetup: false, role: "USER" }, rerender);
    refetchSession({ requiresTwoFactorSetup: true, role: "USER" }, rerender);

    expect(screen.getByTestId("enable-2fa-modal")).toBeInTheDocument();
  });

  it("refreshes the session and closes when setup is finished", async () => {
    render(<RequiredTwoFactorSetupModal />);

    fireEvent.click(screen.getByText("verify code"));
    await finishSetup();

    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.invalidateMe).toHaveBeenCalled();
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(screen.queryByTestId("enable-2fa-modal")).not.toBeInTheDocument();
  });

  it("stays open if the refreshed session still requires setup, since the server is the source of truth", async () => {
    mocks.update.mockResolvedValue(null);
    render(<RequiredTwoFactorSetupModal />);

    await finishSetup();

    expect(screen.getByTestId("enable-2fa-modal")).toBeInTheDocument();
  });

  it("signs inactive admins out instead, since their role is only restored at login", async () => {
    mocks.sessionUser = { requiresTwoFactorSetup: true, role: "INACTIVE_ADMIN" };
    render(<RequiredTwoFactorSetupModal />);

    await finishSetup();

    expect(mocks.signOut).toHaveBeenCalledWith({ callbackUrl: "/auth/login" });
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
