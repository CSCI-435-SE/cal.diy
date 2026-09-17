import type { EventTypeSetupProps, FormValues } from "@calcom/features/eventtypes/lib/types";
import { showToast } from "@calcom/ui/components/toast";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";
import { useForm } from "react-hook-form";
import { vi } from "vitest";

import { EventTypeSingleLayout } from "./EventTypeLayout";

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({ t: (key: string) => key }),
}));

vi.mock("@calcom/ui/components/toast", () => ({
  showToast: vi.fn(),
}));

vi.mock("@calcom/web/modules/shell/Shell", () => ({
  __esModule: true,
  default: ({ CTA, children }: { CTA?: ReactNode; children?: ReactNode }) => (
    <div>
      {CTA}
      {children}
    </div>
  ),
}));

vi.mock("../../../../../packages/platform/atoms/src/components/ui/shell", () => ({
  Shell: ({ CTA, children }: { CTA?: ReactNode; children?: ReactNode }) => (
    <div>
      {CTA}
      {children}
    </div>
  ),
}));

vi.mock("@calcom/web/modules/embed/components/EventTypeEmbed", () => ({
  EventTypeEmbedButton: () => null,
  EventTypeEmbedDialog: () => null,
}));

vi.mock("./dialogs/DeleteDialog", () => ({
  DeleteDialog: () => null,
}));

// Radix's Dropdown only mounts its content when open, which requires pointer-event
// simulation jsdom doesn't support well. Mirror the existing repo pattern (see
// AddVariablesDropdown.test.tsx) of stubbing the dropdown primitives so menu items
// are always present in the DOM for direct interaction.
vi.mock("@calcom/ui/components/dropdown", () => ({
  Dropdown: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <div />,
  DropdownItem: ({ children, ...rest }: { children: ReactNode }) => (
    <button type="button" {...rest}>
      {children}
    </button>
  ),
}));

type LayoutProps = ComponentProps<typeof EventTypeSingleLayout>;

const mockEventType = {
  id: 1,
  slug: "test-event",
  title: "Test Event",
  team: null,
} as unknown as EventTypeSetupProps["eventType"];

const baseProps = {
  eventType: mockEventType,
  currentUserMembership: null,
  team: null,
  isUserOrganizationAdmin: false,
  bookerUrl: "https://cal.diy",
  onDelete: vi.fn(),
  tabsNavigation: [],
  isPlatform: false,
  children: <div>Event type form content</div>,
} as unknown as LayoutProps;

function TestHarness() {
  const formMethods = useForm<FormValues>({
    defaultValues: {
      id: 1,
      slug: "test-event",
      hidden: false,
      metadata: {},
      schedulingType: null,
      users: [{ username: "test-user" }],
    },
  });

  return (
    <TooltipProvider>
      <EventTypeSingleLayout {...baseProps} formMethods={formMethods} />
    </TooltipProvider>
  );
}

describe("EventTypeSingleLayout - copy link toast translation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn() },
      configurable: true,
    });
  });

  it("passes the translation key to showToast when the desktop copy-link button is clicked", () => {
    render(<TestHarness />);

    fireEvent.click(screen.getByTestId("copy-link-button"));

    expect(showToast).toHaveBeenCalledWith("link_copied", "success");
  });

  it("passes the translation key to showToast when the mobile copy-link dropdown item is clicked", () => {
    render(<TestHarness />);

    fireEvent.click(screen.getByTestId("copy-link-dropdown-item"));

    expect(showToast).toHaveBeenCalledWith("link_copied", "success");
  });
});
