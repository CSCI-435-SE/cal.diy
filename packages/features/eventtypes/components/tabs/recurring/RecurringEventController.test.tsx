import type { EventTypeSetup, FormValues } from "@calcom/features/eventtypes/lib/types";
import { Frequency } from "@calcom/prisma/zod-utils";
import type { RecurringEvent } from "@calcom/types/Calendar";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { UseFormReturn } from "react-hook-form";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import RecurringEventController from "./RecurringEventController";

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
}));

// SettingsToggle animates with auto-animate, which needs browser APIs jsdom doesn't have.
vi.mock("@formkit/auto-animate/react", () => ({
  useAutoAnimate: () => [null],
}));

const newYorkMondayFirst = { timeZone: "America/New_York", weekStart: "Monday" };

let form: UseFormReturn<FormValues>;

function Harness({
  recurringEvent,
  user,
}: {
  recurringEvent: RecurringEvent | null;
  user?: { timeZone: string; weekStart: string };
}) {
  const methods = useForm<FormValues>({
    defaultValues: { recurringEvent, seatsPerTimeSlot: null, maxActiveBookingsPerBooker: null },
  });
  form = methods;
  const eventType = { recurringEvent } as unknown as EventTypeSetup;
  return (
    <FormProvider {...methods}>
      <RecurringEventController eventType={eventType} paymentEnabled={false} user={user} />
    </FormProvider>
  );
}

const weekly = { interval: 1, count: 8, freq: Frequency.WEEKLY } as RecurringEvent;

const weekdayButtons = () => within(screen.getByTestId("recurring-event-weekdays")).getAllByRole("button");
const dayButton = (name: string) => screen.getByRole("button", { name });

describe("RecurringEventController weekday row", () => {
  it("shows seven day buttons for a weekly rule, ordered from the user's start of week", () => {
    render(<Harness recurringEvent={weekly} user={newYorkMondayFirst} />);
    expect(weekdayButtons().map((button) => button.getAttribute("aria-label"))).toEqual([
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ]);
  });

  it("starts on Sunday when no user is given", () => {
    render(<Harness recurringEvent={weekly} />);
    expect(weekdayButtons()[0].getAttribute("aria-label")).toBe("Sunday");
  });

  it.each([Frequency.MONTHLY, Frequency.YEARLY])("hides the row for frequency %s", (freq) => {
    render(<Harness recurringEvent={{ ...weekly, freq } as RecurringEvent} user={newYorkMondayFirst} />);
    expect(screen.queryByTestId("recurring-event-weekdays")).toBeNull();
  });

  it("saves selected days as rrule numbers with the user's time zone and week start", () => {
    render(<Harness recurringEvent={{ ...weekly, byweekday: [] }} user={newYorkMondayFirst} />);
    fireEvent.click(dayButton("Thursday"));
    fireEvent.click(dayButton("Tuesday"));

    expect(form.getValues("recurringEvent")).toEqual({
      ...weekly,
      byweekday: [1, 3],
      tzid: "America/New_York",
      wkst: 0,
    });
    expect(dayButton("Tuesday").getAttribute("aria-pressed")).toBe("true");
    expect(dayButton("Monday").getAttribute("aria-pressed")).toBe("false");
  });

  it("saves Sunday as rrule 6 and a Sunday week start as wkst 6", () => {
    render(
      <Harness
        recurringEvent={{ ...weekly, byweekday: [] }}
        user={{ timeZone: "Europe/London", weekStart: "Sunday" }}
      />
    );
    fireEvent.click(dayButton("Sunday"));
    expect(form.getValues("recurringEvent")).toMatchObject({ byweekday: [6], wkst: 6 });
  });

  it("does not write a time zone or week start when no user is given", () => {
    render(<Harness recurringEvent={{ ...weekly, byweekday: [] }} />);
    fireEvent.click(dayButton("Tuesday"));
    const saved = form.getValues("recurringEvent");
    expect(saved).toMatchObject({ byweekday: [1] });
    expect(saved).not.toHaveProperty("tzid");
    expect(saved).not.toHaveProperty("wkst");
  });

  it("shows the message when the last selected day is deselected", () => {
    render(<Harness recurringEvent={{ ...weekly, byweekday: [1] }} user={newYorkMondayFirst} />);
    expect(screen.queryByText("recurring_select_at_least_one_day")).toBeNull();

    fireEvent.click(dayButton("Tuesday"));

    expect(form.getValues("recurringEvent")?.byweekday).toEqual([]);
    expect(screen.getByText("recurring_select_at_least_one_day")).toBeTruthy();
  });

  it("starts a newly enabled rule with an empty day list and shows the message", () => {
    render(<Harness recurringEvent={null} user={newYorkMondayFirst} />);
    fireEvent.click(screen.getByTestId("recurring-event-check"));

    expect(form.getValues("recurringEvent")?.byweekday).toEqual([]);
    expect(weekdayButtons().every((button) => button.getAttribute("aria-pressed") === "false")).toBe(true);
    expect(screen.getByText("recurring_select_at_least_one_day")).toBeTruthy();
  });

  it("shows no message for a rule saved before days existed", () => {
    render(<Harness recurringEvent={weekly} user={newYorkMondayFirst} />);
    expect(screen.queryByText("recurring_select_at_least_one_day")).toBeNull();
    expect(form.getValues("recurringEvent")).not.toHaveProperty("byweekday");
  });

  it("keeps the selected days in the form while the row is hidden for a monthly rule", () => {
    render(
      <Harness
        recurringEvent={{ ...weekly, freq: Frequency.MONTHLY, byweekday: [1, 3] } as RecurringEvent}
        user={newYorkMondayFirst}
      />
    );
    expect(screen.queryByTestId("recurring-event-weekdays")).toBeNull();
    expect(form.getValues("recurringEvent")?.byweekday).toEqual([1, 3]);
  });
});
