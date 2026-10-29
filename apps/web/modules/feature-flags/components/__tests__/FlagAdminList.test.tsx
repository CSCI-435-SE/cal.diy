import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FlagAdminList } from "../FlagAdminList";

const mocks = vi.hoisted(() => ({
  flags: [] as { slug: string; enabled: boolean; type: string; description: string }[],
}));

vi.mock("@calcom/trpc/react", () => ({
  trpc: {
    useUtils: () => ({
      viewer: { features: { list: { invalidate: () => {} }, map: { invalidate: () => {} } } },
    }),
    viewer: {
      features: {
        list: {
          useSuspenseQuery: () => [mocks.flags],
        },
      },
      admin: {
        toggleFeatureFlag: {
          useMutation: () => ({ mutate: () => {} }),
        },
      },
    },
  },
}));

vi.mock("../AssignFeatureSheet", () => ({
  AssignFeatureSheet: () => null,
}));

const emailVerificationFlag = {
  slug: "email-verification",
  enabled: true,
  type: "OPERATIONAL",
  description: "Enable email verification for new users",
};
const requireTwoFactorAuthFlag = {
  slug: "require-two-factor-auth",
  enabled: false,
  type: "OPERATIONAL",
  description: "Require two-factor authentication for all users who sign in with a password",
};
const bookingsV3Flag = {
  slug: "bookings-v3",
  enabled: false,
  type: "RELEASE",
  description: "Enable the new bookings view",
};

describe("FlagAdminList", () => {
  it("hides the require-two-factor-auth flag", () => {
    mocks.flags = [emailVerificationFlag, requireTwoFactorAuthFlag, bookingsV3Flag];

    render(<FlagAdminList />);

    expect(screen.queryByText("require-two-factor-auth")).not.toBeInTheDocument();
  });

  it("still lists every other flag", () => {
    mocks.flags = [emailVerificationFlag, requireTwoFactorAuthFlag, bookingsV3Flag];

    render(<FlagAdminList />);

    expect(screen.getByText("email-verification")).toBeInTheDocument();
    expect(screen.getByText("bookings-v3")).toBeInTheDocument();
  });

  it("does not render an empty group when the hidden flag is the only one of its type", () => {
    mocks.flags = [requireTwoFactorAuthFlag, bookingsV3Flag];

    render(<FlagAdminList />);

    expect(screen.queryByText("OPERATIONAL")).not.toBeInTheDocument();
    expect(screen.getByText("RELEASE")).toBeInTheDocument();
  });
});
