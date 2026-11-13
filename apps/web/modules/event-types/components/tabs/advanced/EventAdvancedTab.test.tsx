import { useEventTypeForm } from "@calcom/atoms/event-types/hooks/useEventTypeForm";
import type { EventTypeSetupProps, EventTypeUpdateInput } from "@calcom/features/eventtypes/lib/types";
import type { Flags } from "@calcom/features/flags/context/provider";
import { FeatureProvider } from "@calcom/features/flags/context/provider";
import { CancellationReasonRequirement, RescheduleReasonRequirement } from "@calcom/prisma/enums";
import { Form } from "@calcom/ui/components/form";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { vi } from "vitest";
import { EventAdvancedTab } from "./EventAdvancedTab";

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({ t: (key: string) => key }),
}));

vi.mock("@formkit/auto-animate/react", () => ({
  useAutoAnimate: () => [null],
}));

// These children load their own data or render large sections unrelated to the reschedule reason
// setting, so they are stubbed the same way EventTypeLayout.test.tsx stubs its heavy children.
vi.mock("@calcom/features/calendars/components/DestinationCalendarSelector", () => ({
  default: () => null,
}));

vi.mock("@calcom/web/modules/calendars/components/SelectedCalendarsSettingsWebWrapper", () => ({
  SelectedCalendarSettingsScope: { User: "user", EventType: "eventType" },
  SelectedCalendarsSettingsWebWrapper: () => null,
  SelectedCalendarsSettingsWebWrapperSkeleton: () => null,
}));

vi.mock("./FormBuilder", () => ({
  FormBuilder: () => null,
}));

vi.mock("./RequiresConfirmationController", () => ({
  default: () => null,
}));

// Renders a marker so tests can check where neighbouring settings are placed.
vi.mock("./DisableReschedulingController", () => ({
  default: () => <div data-testid="disable-rescheduling-controller" />,
}));

const mockEventType = {
  id: 1,
  title: "Test Event",
  slug: "test-event",
  length: 30,
  metadata: {},
  bookingFields: [],
  locations: [],
  users: [],
  hosts: [],
  children: [],
  hashedLink: [],
  team: null,
  schedulingType: null,
  requiresCancellationReason: CancellationReasonRequirement.MANDATORY_HOST_ONLY,
  requiresRescheduleReason: RescheduleReasonRequirement.OPTIONAL_BOTH,
} as unknown as EventTypeSetupProps["eventType"];

function AdvancedTabHarness({
  onSubmit,
  flags = {},
}: {
  onSubmit: (data: EventTypeUpdateInput) => void;
  flags?: Flags;
}) {
  const { form, handleSubmit } = useEventTypeForm({ eventType: mockEventType, onSubmit });

  return (
    <FeatureProvider value={flags}>
      <TooltipProvider>
        <Form form={form} handleSubmit={handleSubmit}>
          <EventAdvancedTab
            eventType={mockEventType}
            team={null}
            calendarsQuery={{ data: undefined, isPending: false, error: null }}
            showToast={vi.fn()}
            showBookerLayoutSelector={false}
            orgId={null}
          />
          <button type="submit">Save event type</button>
        </Form>
      </TooltipProvider>
    </FeatureProvider>
  );
}

const getRescheduleReasonSetting = () => {
  const setting = screen.getByText("require_reschedule_reason").closest(".border-subtle");
  if (!(setting instanceof HTMLElement)) throw new Error("Require reschedule reason setting not found");
  return setting;
};

const chooseRescheduleReason = (optionLabel: string) => {
  const setting = getRescheduleReasonSetting();
  const select = within(setting).getByRole("combobox");
  select.focus();
  fireEvent.keyDown(select, { key: "ArrowDown", code: "ArrowDown" });
  fireEvent.click(within(setting).getByText(optionLabel));
};

describe("EventAdvancedTab - require reschedule reason", () => {
  it.each([
    ["mandatory_for_both", RescheduleReasonRequirement.MANDATORY_BOTH],
    ["mandatory_for_host_only", RescheduleReasonRequirement.MANDATORY_HOST_ONLY],
    ["mandatory_for_attendee_only", RescheduleReasonRequirement.MANDATORY_ATTENDEE_ONLY],
  ])("saves the %s option as %s when the event type is submitted", async (optionLabel, savedValue) => {
    const onSubmit = vi.fn();
    render(<AdvancedTabHarness onSubmit={onSubmit} />);

    chooseRescheduleReason(optionLabel);
    fireEvent.click(screen.getByRole("button", { name: "Save event type" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const payload = onSubmit.mock.calls[0][0];
    expect(payload).toMatchObject({ id: 1, requiresRescheduleReason: savedValue });
    expect(payload).not.toHaveProperty("requiresCancellationReason");
  });
});

describe("EventAdvancedTab - minimum cancellation notice", () => {
  it("hides the setting while the feature flag is off", () => {
    render(<AdvancedTabHarness onSubmit={vi.fn()} />);

    expect(screen.getByTestId("disable-rescheduling-controller")).toBeInTheDocument();
    expect(screen.queryByTestId("minimum-cancellation-notice-toggle")).not.toBeInTheDocument();
  });

  it("places the setting directly after Disable rescheduling, below Disable Cancelling", () => {
    render(<AdvancedTabHarness onSubmit={vi.fn()} flags={{ "minimum-cancellation-notice": true }} />);

    const disableCancelling = screen.getByTestId("disable-cancelling-toggle");
    const disableRescheduling = screen.getByTestId("disable-rescheduling-controller");
    const cancellationNotice = screen.getByTestId("minimum-cancellation-notice-toggle");

    expect(disableCancelling.compareDocumentPosition(disableRescheduling)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
    expect(disableRescheduling.nextElementSibling).toContainElement(cancellationNotice);
  });
});
