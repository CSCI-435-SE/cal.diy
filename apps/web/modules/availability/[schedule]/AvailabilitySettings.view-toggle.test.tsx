import { AvailabilitySettings } from "@calcom/atoms/availability/AvailabilitySettings";
import {
  AVAILABILITY_VIEW_STORAGE_KEY,
  useAvailabilityView,
} from "@calcom/features/schedules/hooks/useAvailabilityView";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

// The web shell, text editor and timezone select pull in tRPC and session providers that are
// irrelevant to which input mode is shown, so they are replaced with lightweight stand-ins
vi.mock("@calcom/web/modules/shell/Shell", () => ({
  default: ({ heading, children }: { heading?: ReactNode; children?: ReactNode }) => (
    <div>
      {heading}
      {children}
    </div>
  ),
}));

vi.mock("@calcom/web/modules/schedules/components/Schedule", () => ({
  default: () => <div data-testid="text-field-schedule" />,
}));

vi.mock("@calcom/web/modules/timezone/components/TimezoneSelect", () => ({
  TimezoneSelect: () => <div data-testid="timezone-select" />,
}));

const schedule = {
  name: "Working hours",
  id: 1,
  isLastSchedule: false,
  isDefault: true,
  workingHours: [],
  dateOverrides: [],
  timeZone: "UTC",
  availability: Array.from({ length: 7 }, () => []),
  schedule: [],
};

const baseProps = {
  schedule,
  handleDelete: vi.fn(),
  handleSubmit: vi.fn(),
  isDeleting: false,
  isSaving: false,
  isLoading: false,
  timeFormat: 12,
  weekStart: "Sunday",
  backPath: "/availability",
};

// Wires the real hook to the real component the same way the web schedule page does
function WebAvailabilitySettings() {
  const [availabilityView, setAvailabilityView] = useAvailabilityView();

  return (
    <AvailabilitySettings
      {...baseProps}
      availabilityView={availabilityView}
      onAvailabilityViewChange={setAvailabilityView}
    />
  );
}

const textEditor = () => screen.queryByTestId("text-field-schedule");
const visualGrid = () => screen.queryByRole("grid");

describe("AvailabilitySettings Text / Visual toggle", () => {
  afterEach(() => {
    window.sessionStorage.clear();
  });

  it("does not render the toggle when no change handler is passed", () => {
    render(<AvailabilitySettings {...baseProps} />);

    expect(screen.queryByTestId("availability-view-visual")).not.toBeInTheDocument();
    expect(textEditor()).toBeInTheDocument();
    expect(visualGrid()).not.toBeInTheDocument();
  });

  it("switches between the text editor and the visual grid, rendering only one", async () => {
    render(<WebAvailabilitySettings />);

    expect(textEditor()).toBeInTheDocument();
    expect(visualGrid()).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId("availability-view-visual"));
    expect(visualGrid()).toBeInTheDocument();
    expect(textEditor()).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId("availability-view-text"));
    expect(textEditor()).toBeInTheDocument();
    expect(visualGrid()).not.toBeInTheDocument();
  });

  it("restores the visual grid from sessionStorage on mount", async () => {
    window.sessionStorage.setItem(AVAILABILITY_VIEW_STORAGE_KEY, "grid");

    render(<WebAvailabilitySettings />);

    expect(await screen.findByRole("grid")).toBeInTheDocument();
    expect(textEditor()).not.toBeInTheDocument();
    expect(screen.getByTestId("availability-view-visual")).toHaveAttribute("aria-checked", "true");
  });
});
