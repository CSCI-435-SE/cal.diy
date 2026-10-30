import { ErrorCode } from "@calcom/features/auth/lib/ErrorCode";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EnableTwoFactorModal from "../EnableTwoFactorModal";

const mocks = vi.hoisted(() => ({
  setup: vi.fn(),
  enable: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock("../TwoFactorAuthAPI", () => ({
  default: { setup: mocks.setup, enable: mocks.enable },
}));

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({ t: (key: string) => key }),
}));

vi.mock("@calcom/ui/components/toast", () => ({
  showToast: mocks.showToast,
}));

vi.mock("@calcom/features/components/controlled-dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: ReactNode }) =>
    open ? <div>{children}</div> : null,
}));

vi.mock("@calcom/ui/components/dialog", () => ({
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

// Stands in for the six-digit input, which writes to the form's totpCode field
vi.mock("@components/auth/TwoFactor", async () => {
  const { useFormContext } = await import("react-hook-form");
  return {
    default: () => {
      const { register } = useFormContext();
      return <input aria-label="totp code" {...register("totpCode")} />;
    },
  };
});

const jsonResponse = (status: number, body: object) => ({ status, json: async () => body });

const submitPassword = async () => {
  const passwordInput = document.querySelector<HTMLInputElement>('input[name="password"]');
  if (!passwordInput) throw new Error("Password input not rendered");
  fireEvent.input(passwordInput, { target: { value: "secret-password" } });
  await act(async () => {
    fireEvent.click(screen.getByText("continue"));
  });
};

const submitTotpCode = async () => {
  fireEvent.click(screen.getByTestId("goto-otp-screen"));
  await act(async () => {
    fireEvent.change(screen.getByLabelText("totp code"), { target: { value: "123456" } });
  });
};

const setupSucceeds = () =>
  mocks.setup.mockResolvedValue(
    jsonResponse(200, { backupCodes: ["aaaaabbbbb"], dataUri: "data:image/png;base64,", secret: "SECRET" })
  );

describe("EnableTwoFactorModal", () => {
  const onEnable = vi.fn();
  const onBackupCodesShown = vi.fn();

  const renderModal = () =>
    render(
      <TooltipProvider>
        <EnableTwoFactorModal open isRequired onEnable={onEnable} onBackupCodesShown={onBackupCodesShown} />
      </TooltipProvider>
    );

  beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = vi.fn(() => "blob:backup-codes");
    URL.revokeObjectURL = vi.fn();
  });

  it("finishes instead of showing an error when another tab enabled 2FA before the password step", async () => {
    mocks.setup.mockResolvedValue(jsonResponse(400, { error: ErrorCode.TwoFactorAlreadyEnabled }));
    renderModal();

    await submitPassword();

    expect(onEnable).toHaveBeenCalledTimes(1);
    expect(mocks.showToast).toHaveBeenCalledWith("2fa_already_enabled", "success");
    expect(screen.queryByText("something_went_wrong")).not.toBeInTheDocument();
  });

  it("finishes instead of showing an error when another tab enabled 2FA before the code step", async () => {
    setupSucceeds();
    mocks.enable.mockResolvedValue(jsonResponse(400, { error: ErrorCode.TwoFactorAlreadyEnabled }));
    renderModal();

    await submitPassword();
    await submitTotpCode();

    expect(mocks.enable).toHaveBeenCalledOnce();
    expect(mocks.enable).toHaveBeenCalledWith("123456");
    expect(onEnable).toHaveBeenCalledTimes(1);
    expect(onBackupCodesShown).not.toHaveBeenCalled();
    expect(screen.queryByText("something_went_wrong")).not.toBeInTheDocument();
  });

  it("reports when backup codes are shown, and waits for the user before calling onEnable", async () => {
    setupSucceeds();
    mocks.enable.mockResolvedValue(jsonResponse(200, { message: "Two-factor enabled" }));
    renderModal();

    await submitPassword();
    await submitTotpCode();

    expect(onBackupCodesShown).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("backup-codes-close")).toBeInTheDocument();
    expect(onEnable).not.toHaveBeenCalled();
  });

  it("still shows the generic error for unexpected failures", async () => {
    mocks.setup.mockResolvedValue(jsonResponse(500, { error: ErrorCode.InternalServerError }));
    renderModal();

    await submitPassword();

    expect(screen.getByText("something_went_wrong")).toBeInTheDocument();
    expect(onEnable).not.toHaveBeenCalled();
  });
});
