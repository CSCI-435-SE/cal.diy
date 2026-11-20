import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PageProps } from "./login-view";
import Login from "./login-view";

const mocks = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
  signIn: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
  signIn: mocks.signIn,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@calcom/lib/hooks/useCompatSearchParams", () => ({
  useCompatSearchParams: () => mocks.searchParams,
}));

// Echoes the key and options so assertions can name the exact translation the page asked for.
vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({
    t: (key: string, options?: Record<string, string>) =>
      options ? `${key}|${JSON.stringify(options)}` : key,
  }),
}));

// Not under test, and they pull in PWA and 2FA dependencies.
vi.mock("@components/AddToHomescreen", () => ({ default: () => null }));
vi.mock("@components/auth/TwoFactor", () => ({ default: () => null }));
vi.mock("@components/auth/BackupCode", () => ({ default: () => null }));

const acme = { id: "cl_acme", displayName: "Acme SSO" };
const partner = { id: "cl_partner", displayName: "Partner Login" };
const continueWith = (name: string) => `continue_with_provider|${JSON.stringify({ providerName: name })}`;

function renderLogin(props: Partial<PageProps> = {}) {
  const defaults: PageProps = {
    csrfToken: "csrf",
    isGoogleLoginEnabled: false,
    isOutlookLoginEnabled: false,
    oidcProviders: [],
    totpEmail: null,
  };
  return render(<Login {...defaults} {...props} />);
}

beforeEach(() => {
  mocks.searchParams = new URLSearchParams();
  window.localStorage.clear();
});

describe("Login page: ?error= messages (AC6)", () => {
  it.each([
    ["OAuthSignin", "auth_error_provider_unreachable"],
    ["Callback", "auth_error_sign_in_failed"],
    ["SomethingNew", "auth_error_sign_in_generic"],
  ])("shows the translated message for ?error=%s", (code, key) => {
    mocks.searchParams = new URLSearchParams({ error: code });
    renderLogin();
    expect(screen.getByText(key)).toBeInTheDocument();
  });

  it("does not show the raw error code", () => {
    mocks.searchParams = new URLSearchParams({ error: "SomethingNew" });
    renderLogin();
    expect(screen.queryByText(/SomethingNew/)).not.toBeInTheDocument();
  });

  it("shows no sign-in error without ?error=", () => {
    renderLogin();
    expect(screen.queryByText(/^auth_error_/)).not.toBeInTheDocument();
  });
});

describe("Login page: OIDC buttons", () => {
  it("shows one button per provider, in the given order, after Google (AC1)", () => {
    renderLogin({ isGoogleLoginEnabled: true, oidcProviders: [acme, partner] });
    const buttons = screen.getAllByRole("button").map((button) => button.getAttribute("data-testid"));
    const order = buttons.filter((id) => id === "google" || id?.startsWith("oidc-"));
    expect(order).toEqual(["google", "oidc-cl_acme", "oidc-cl_partner"]);
    expect(screen.getByTestId("oidc-cl_acme")).toHaveTextContent(continueWith("Acme SSO"));
    expect(screen.getByTestId("oidc-cl_partner")).toHaveTextContent(continueWith("Partner Login"));
  });

  it("starts the oidc-<id> flow and records it as last used on click (AC1)", () => {
    renderLogin({ oidcProviders: [acme] });
    fireEvent.click(screen.getByTestId("oidc-cl_acme"));
    expect(mocks.signIn).toHaveBeenCalledWith("oidc-cl_acme", { callbackUrl: expect.any(String) });
    expect(window.localStorage.getItem("last_cal_login")).toBe("oidc-cl_acme");
  });

  it("shows the Last used badge on the provider used last time (AC1)", () => {
    window.localStorage.setItem("last_cal_login", "oidc-cl_partner");
    renderLogin({ oidcProviders: [acme, partner] });
    expect(within(screen.getByTestId("oidc-cl_partner")).getByText("last_used")).toBeInTheDocument();
    expect(within(screen.getByTestId("oidc-cl_acme")).queryByText("last_used")).not.toBeInTheDocument();
  });

  it("shows the buttons and the divider when only OIDC is enabled (AC2)", () => {
    renderLogin({ oidcProviders: [acme] });
    expect(screen.getByTestId("oidc-cl_acme")).toBeInTheDocument();
    expect(screen.getByText("or")).toBeInTheDocument();
  });

  it("looks as before with no providers: no OIDC buttons and no divider (AC3)", () => {
    renderLogin();
    expect(screen.queryByTestId(/^oidc-/)).not.toBeInTheDocument();
    expect(screen.queryByText("or")).not.toBeInTheDocument();
  });
});
