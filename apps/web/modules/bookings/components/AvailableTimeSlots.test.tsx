import { render } from "@calcom/features/bookings/Booker/__tests__/test-utils";
import { BookerLayouts } from "@calcom/prisma/zod-utils";
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Slot } from "~/schedules/lib/types";
import { AvailableTimeSlots } from "./AvailableTimeSlots";

const day = vi.hoisted(() => ({ slots: [] as Slot[] }));

vi.mock("@calcom/web/modules/schedules/hooks/useSlotsForDate", () => ({
  useSlotsForAvailableDates: () => ({
    slotsPerDay: [{ date: "2026-10-08", slots: day.slots }],
    toggleConfirmButton: vi.fn(),
  }),
}));

vi.mock("@calcom/web/modules/schedules/hooks/useNonEmptyScheduleDays", () => ({
  useNonEmptyScheduleDays: () => [],
}));

vi.mock("@calcom/web/modules/bookings/hooks/useWaitlistBookedTimes", () => ({
  useWaitlistBookedTimes: () => ({}),
}));

// The slot list itself is covered by AvailableTimes.test.tsx. Here only the header's toggle is under test.
vi.mock("@calcom/web/modules/bookings/components/AvailableTimes", () => ({
  AvailableTimes: () => null,
  AvailableTimesSkeleton: () => null,
}));

vi.mock("@calcom/web/modules/bookings/components/AvailableTimesHeader", () => ({
  AvailableTimesHeader: ({ showTimeFormatToggle }: { showTimeFormatToggle?: boolean }) => (
    <div data-testid="header">{showTimeFormatToggle ? "toggle shown" : "toggle hidden"}</div>
  ),
}));

const host = { fromUser: { id: 1, displayName: "Host" } };
const at = (hour: number) => `2026-10-08T${String(hour).padStart(2, "0")}:00:00.000Z`;
const awayWindow = { outOfOfficeStart: at(9), outOfOfficeEnd: at(17) };

const renderHeader = (slots: Slot[], layout: BookerLayouts = BookerLayouts.MONTH_VIEW) => {
  day.slots = slots;
  render(
    <AvailableTimeSlots
      isLoading={false}
      event={{ data: null }}
      loadingStates={{ creatingBooking: false, creatingRecurringBooking: false }}
      isVerificationCodeSending={false}
      renderConfirmNotVerifyEmailButtonCond={false}
      onSubmit={vi.fn()}
      skipConfirmStep={false}
      unavailableTimeSlots={[]}
      onAvailableTimeSlotSelect={vi.fn()}
    />,
    { mockStore: { selectedDate: "2026-10-08", layout } }
  );
  return screen.getByTestId("header").textContent;
};

describe("AvailableTimeSlots time format toggle (issue #130)", () => {
  it("shows the toggle on a day with bookable slots", () => {
    expect(renderHeader([{ time: at(9) }, { time: at(10) }])).toBe("toggle shown");
  });

  it("shows the toggle when the first slot is away and the rest of the day is bookable", () => {
    expect(renderHeader([{ time: at(9), away: true, ...host }, { time: at(10) }])).toBe("toggle shown");
  });

  it("shows the toggle when one window with hours covers every slot, because the panel prints times", () => {
    const slots = [9, 10, 11].map((hour) => ({ time: at(hour), away: true, ...host, ...awayWindow }));
    expect(renderHeader(slots)).toBe("toggle shown");
  });

  it("hides the toggle for a whole-day entry, which prints no times", () => {
    const slots = [9, 10, 11].map((hour) => ({ time: at(hour), away: true, ...host }));
    expect(renderHeader(slots)).toBe("toggle hidden");
  });

  it("hides the toggle in column view, as it did before #130", () => {
    expect(renderHeader([{ time: at(9) }, { time: at(10) }], BookerLayouts.COLUMN_VIEW)).toBe(
      "toggle hidden"
    );
  });
});
