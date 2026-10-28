import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SecurityView from "../security-view";

type MutationOptions = {
  onSuccess?: (feature: { enabled: boolean }) => void;
  onError?: () => void;
};

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  showToast: vi.fn(),
  invalidateMap: vi.fn(),
  invalidateList: vi.fn(),
  mutationOptions: {} as MutationOptions,
}));

vi.mock("@calcom/trpc/react", () => ({
  trpc: {
    useUtils: () => ({
      viewer: {
        features: {
          map: { invalidate: mocks.invalidateMap },
          list: { invalidate: mocks.invalidateList },
        },
      },
    }),
    viewer: {
      admin: {
        toggleFeatureFlag: {
          useMutation: (options: MutationOptions) => {
            mocks.mutationOptions = options;
            return { mutate: mocks.mutate, isPending: false };
          },
        },
      },
    },
  },
}));

vi.mock("@calcom/ui/components/toast", () => ({
  showToast: mocks.showToast,
}));

const mutationSucceeds = () => {
  mocks.mutate.mockImplementation((input: { enabled: boolean }) =>
    mocks.mutationOptions.onSuccess?.({ enabled: input.enabled })
  );
};

const mutationFails = () => {
  mocks.mutate.mockImplementation(() => mocks.mutationOptions.onError?.());
};

describe("SecurityView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutationSucceeds();
  });

  it("shows the saved value on first render", () => {
    render(<SecurityView initialEnabled={true} />);

    expect(screen.getByRole("switch")).toBeChecked();
  });

  it("turns the requirement on immediately without asking for confirmation", () => {
    render(<SecurityView initialEnabled={false} />);

    fireEvent.click(screen.getByRole("switch"));

    expect(screen.queryByText("require_2fa_disable_confirm_title")).not.toBeInTheDocument();
    expect(mocks.mutate).toHaveBeenCalledWith({ slug: "require-two-factor-auth", enabled: true });
    expect(screen.getByRole("switch")).toBeChecked();
    expect(mocks.showToast).toHaveBeenCalledWith("require_2fa_setting_updated", "success");
    expect(mocks.invalidateMap).toHaveBeenCalled();
    expect(mocks.invalidateList).toHaveBeenCalled();
  });

  it("asks for confirmation before turning the requirement off", () => {
    render(<SecurityView initialEnabled={true} />);

    fireEvent.click(screen.getByRole("switch"));

    expect(screen.getByText("require_2fa_disable_confirm_title")).toBeInTheDocument();
    expect(mocks.mutate).not.toHaveBeenCalled();
    expect(screen.getByRole("switch", { hidden: true })).toBeChecked();
  });

  it("keeps the requirement on when the confirmation is cancelled", () => {
    render(<SecurityView initialEnabled={true} />);

    fireEvent.click(screen.getByRole("switch"));
    fireEvent.click(screen.getByText("cancel"));

    expect(mocks.mutate).not.toHaveBeenCalled();
    expect(screen.getByRole("switch")).toBeChecked();
  });

  it("turns the requirement off after confirmation", () => {
    render(<SecurityView initialEnabled={true} />);

    fireEvent.click(screen.getByRole("switch"));
    fireEvent.click(screen.getByText("require_2fa_disable_confirm_button"));

    expect(mocks.mutate).toHaveBeenCalledWith({ slug: "require-two-factor-auth", enabled: false });
    expect(screen.getByRole("switch")).not.toBeChecked();
  });

  it("shows an error and keeps the saved value when saving fails", () => {
    mutationFails();
    render(<SecurityView initialEnabled={false} />);

    fireEvent.click(screen.getByRole("switch"));

    expect(mocks.showToast).toHaveBeenCalledWith("require_2fa_setting_update_failed", "error");
    expect(screen.getByRole("switch")).not.toBeChecked();
  });
});
