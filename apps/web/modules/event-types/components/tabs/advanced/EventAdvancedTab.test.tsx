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

// Keys stay untranslated, except templates with <0></0> placeholders: without them ServerTrans
// would not render the inputs embedded in those sentences.
vi.mock("@calcom/lib/hooks/useLocale", async () => {
  const { default: enCommon } = await import("@calcom/i18n/locales/en/common.json");
  const translations: Record<string, unknown> = enCommon;
  return {
    useLocale: () => ({
      t: (key: string) => {
        const translation = translations[key];
        return typeof translation === "string" && translation.includes("<0>") ? translation : key;
      },
    }),
  };
});

const isPlatformMock = vi.hoisted(() => vi.fn(() => false));

vi.mock("@calcom/atoms/hooks/useIsPlatform", () => ({
  useIsPlatform: isPlatformMock,
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
  eventType = mockEventType,
}: {
  onSubmit: (data: EventTypeUpdateInput) => void;
  flags?: Flags;
  eventType?: EventTypeSetupProps["eventType"];
}) {
  const { form, handleSubmit } = useEventTypeForm({ eventType, onSubmit });

  return (
    <FeatureProvider value={flags}>
      <TooltipProvider>
        <Form form={form} handleSubmit={handleSubmit}>
          <EventAdvancedTab
            eventType={eventType}
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

  const flagOn = { "minimum-cancellation-notice": true };
  const withSavedNotice = (minimumCancellationNotice: number) =>
    ({ ...mockEventType, minimumCancellationNotice }) as EventTypeSetupProps["eventType"];
  const noticeToggle = () => screen.getByTestId("minimum-cancellation-notice-toggle");
  const noticeInput = () => screen.getByTestId("minimum-cancellation-notice-input") as HTMLInputElement;
  const saveAndGetPayload = async (onSubmit: ReturnType<typeof vi.fn>) => {
    fireEvent.click(screen.getByRole("button", { name: "Save event type" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    return onSubmit.mock.calls[0][0];
  };

  it("shows the saved notice when the event type is reopened", () => {
    render(<AdvancedTabHarness onSubmit={vi.fn()} flags={flagOn} eventType={withSavedNotice(1440)} />);

    expect(noticeToggle()).toHaveAttribute("aria-checked", "true");
    expect(noticeInput().value).toBe("24");
    expect(screen.getByText("hours")).toBeInTheDocument();
  });

  it("saves the notice the host sets, in minutes", async () => {
    const onSubmit = vi.fn();
    render(<AdvancedTabHarness onSubmit={onSubmit} flags={flagOn} />);

    fireEvent.click(noticeToggle());
    const unitSelect = screen.getByLabelText("minimum_cancellation_notice_unit");
    fireEvent.keyDown(unitSelect, { key: "ArrowDown", code: "ArrowDown" });
    fireEvent.click(screen.getByRole("option", { name: "hours" }));
    fireEvent.change(noticeInput(), { target: { value: "24" } });

    expect(await saveAndGetPayload(onSubmit)).toMatchObject({ id: 1, minimumCancellationNotice: 1440 });
  });

  it("saves no notice when the host switches the setting off", async () => {
    const onSubmit = vi.fn();
    render(<AdvancedTabHarness onSubmit={onSubmit} flags={flagOn} eventType={withSavedNotice(1440)} />);

    fireEvent.click(noticeToggle());

    expect(await saveAndGetPayload(onSubmit)).toMatchObject({ id: 1, minimumCancellationNotice: null });
  });

  it("clears the saved notice when Disable Cancelling is turned on", async () => {
    const onSubmit = vi.fn();
    render(<AdvancedTabHarness onSubmit={onSubmit} flags={flagOn} eventType={withSavedNotice(1440)} />);

    fireEvent.click(screen.getByTestId("disable-cancelling-toggle"));

    expect(screen.queryByTestId("minimum-cancellation-notice-toggle")).not.toBeInTheDocument();
    expect(await saveAndGetPayload(onSubmit)).toMatchObject({
      disableCancelling: true,
      minimumCancellationNotice: null,
    });
  });
});

describe("EventAdvancedTab - offer a waitlist", () => {
  const withMetadata = (metadata: Record<string, unknown> | null) =>
    ({ ...mockEventType, metadata }) as EventTypeSetupProps["eventType"];
  const waitlistToggle = () => screen.getByTestId("offer-waitlist-toggle");
  const saveAndGetPayload = async (onSubmit: ReturnType<typeof vi.fn>) => {
    fireEvent.click(screen.getByRole("button", { name: "Save event type" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    return onSubmit.mock.calls[0][0];
  };

  it("is on by default for event types saved before the setting existed", () => {
    render(<AdvancedTabHarness onSubmit={vi.fn()} eventType={withMetadata(null)} />);

    expect(screen.getByText("offer_waitlist")).toBeInTheDocument();
    expect(screen.getByText("offer_waitlist_description")).toBeInTheDocument();
    expect(waitlistToggle()).toHaveAttribute("aria-checked", "true");
  });

  it("sits between the Offer seats and Hide organizer email settings", () => {
    render(<AdvancedTabHarness onSubmit={vi.fn()} />);

    const seats = screen.getByTestId("offer-seats-toggle");
    const hideOrganizerEmail = screen.getByText("hide_organizer_email");
    expect(seats.compareDocumentPosition(waitlistToggle())).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(waitlistToggle().compareDocumentPosition(hideOrganizerEmail)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
  });

  it("shows the waitlist as off when the event type is reopened after turning it off", () => {
    render(<AdvancedTabHarness onSubmit={vi.fn()} eventType={withMetadata({ disableWaitlist: true })} />);

    expect(waitlistToggle()).toHaveAttribute("aria-checked", "false");
  });

  it("saves disableWaitlist in the metadata when turned off, keeping the other metadata", async () => {
    const onSubmit = vi.fn();
    render(
      <AdvancedTabHarness onSubmit={onSubmit} eventType={withMetadata({ bookingReminderMinutes: 60 })} />
    );

    fireEvent.click(waitlistToggle());

    expect(waitlistToggle()).toHaveAttribute("aria-checked", "false");
    expect(await saveAndGetPayload(onSubmit)).toMatchObject({
      id: 1,
      metadata: { bookingReminderMinutes: 60, disableWaitlist: true },
    });
  });

  it("saves the waitlist as on again when turned back on", async () => {
    const onSubmit = vi.fn();
    render(<AdvancedTabHarness onSubmit={onSubmit} eventType={withMetadata({ disableWaitlist: true })} />);

    fireEvent.click(waitlistToggle());

    expect(await saveAndGetPayload(onSubmit)).toMatchObject({ id: 1, metadata: { disableWaitlist: false } });
  });

  it("sends nothing about the waitlist when the host saves without touching it", async () => {
    const onSubmit = vi.fn();
    render(<AdvancedTabHarness onSubmit={onSubmit} />);

    chooseRescheduleReason("mandatory_for_both");

    expect(await saveAndGetPayload(onSubmit)).not.toHaveProperty("metadata");
  });

  it("is hidden in platform builds, which have no waitlist", () => {
    isPlatformMock.mockReturnValue(true);
    try {
      render(<AdvancedTabHarness onSubmit={vi.fn()} />);
      expect(screen.queryByTestId("offer-waitlist-toggle")).not.toBeInTheDocument();
      expect(screen.getByTestId("offer-seats-toggle")).toBeInTheDocument();
    } finally {
      isPlatformMock.mockReturnValue(false);
    }
  });
});
