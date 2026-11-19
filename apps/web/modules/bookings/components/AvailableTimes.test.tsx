import { render } from "@calcom/features/bookings/Booker/__tests__/test-utils";
import type { Slots } from "@calcom/features/bookings/types";
import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AvailableTimes } from "./AvailableTimes";

const push = vi.fn();
// What the attendee selected on the booking page. A test changes it to stand in another zone or format.
const bookerTime = vi.hoisted(() => ({ timeFormat: "HH:mm", timezone: "UTC" }));

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
  usePathname: () => "/host",
}));

vi.mock("@calcom/atoms/hooks/useIsPlatform", () => ({
  useIsPlatform: () => false,
}));

vi.mock("@calcom/features/bookings/Booker/hooks/useBookerTime", () => ({
  useBookerTime: () => bookerTime,
}));

vi.mock("@calcom/features/bookings/lib/useCheckOverlapWithOverlay", () => ({
  useCheckOverlapWithOverlay: () => ({
    isOverlapping: false,
    overlappingTimeStart: "",
    overlappingTimeEnd: "",
  }),
}));

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({
    t: (key: string, values?: { displayName?: string; start?: string; end?: string }) => {
      // The English string of `ooo_away_window`, as issue #130 words it.
      if (key === "ooo_away_window") return `Away ${values?.start} to ${values?.end}`;
      return values?.displayName ? `${key}:${values.displayName}` : key;
    },
    isLocaleReady: true,
    i18n: { language: "en" },
  }),
}));

type Slot = Slots[string][number];

const host = { fromUser: { id: 1, displayName: "Host" }, emoji: "🩺", showNotePublicly: false };

// 09:00 to 16:00 UTC on 2026-10-08, one slot an hour. The hours listed are away.
const dayWith = (awayHours: number[], awayData: Partial<Slot> = host): Slot[] =>
  Array.from({ length: 8 }, (_, index) => {
    const hour = 9 + index;
    const time = `2026-10-08T${String(hour).padStart(2, "0")}:00:00.000Z`;
    return awayHours.includes(hour) ? { time, away: true, ...awayData } : { time };
  });

const renderDay = (slots: Slot[]) => render(<AvailableTimes slots={slots} event={{ data: null }} />);

const windowOf = (start: string, end: string) => ({
  outOfOfficeStart: `2026-10-08T${start}:00.000Z`,
  outOfOfficeEnd: `2026-10-08T${end}:00.000Z`,
});

// Marks the slot that starts at `hour` UTC as away for the given entry.
const awayAt = (slots: Slot[], hour: number, awayData: Partial<Slot>): Slot[] =>
  slots.map((slot) =>
    Number(slot.time.slice(11, 13)) === hour ? { ...slot, away: true, ...awayData } : slot
  );

const panelOf = (text: string) => {
  const panel = screen.getByText(text).closest<HTMLElement>(".border-dashed");
  if (!panel) throw new Error(`No away panel holds "${text}"`);
  return panel;
};

const isBefore = (first: HTMLElement, second: HTMLElement) =>
  !!(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);

// The hours of the slot buttons that come before and after the panel in document order.
const hoursAround = (panel: HTMLElement) => {
  const hourOf = (button: HTMLElement) => Number(button.dataset.time?.slice(11, 13));
  const buttons = screen.getAllByTestId("time");
  return {
    before: buttons
      .filter((button) => button.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING)
      .map(hourOf),
    after: buttons
      .filter((button) => button.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_PRECEDING)
      .map(hourOf),
  };
};

describe("AvailableTimes with a partial-day out-of-office window", () => {
  afterEach(() => {
    vi.clearAllMocks();
    bookerTime.timeFormat = "HH:mm";
    bookerTime.timezone = "UTC";
  });

  it("renders the slots before the window, one away panel, then the slots after it", () => {
    renderDay(dayWith([14, 15]));

    const panel = screen.getByText("ooo_user_is_ooo:Host");
    expect(screen.getAllByText("ooo_user_is_ooo:Host")).toHaveLength(1);
    expect(hoursAround(panel)).toEqual({ before: [9, 10, 11, 12, 13], after: [16] });
    expect(screen.queryByText("14:00")).toBeNull();
    expect(screen.queryByText("15:00")).toBeNull();
  });

  it("puts the panel first for a window at the start of the day", () => {
    renderDay(dayWith([9, 10]));

    expect(hoursAround(screen.getByText("ooo_user_is_ooo:Host"))).toEqual({
      before: [],
      after: [11, 12, 13, 14, 15, 16],
    });
  });

  it("puts the panel last for a window at the end of the day", () => {
    renderDay(dayWith([15, 16]));

    expect(hoursAround(screen.getByText("ooo_user_is_ooo:Host"))).toEqual({
      before: [9, 10, 11, 12, 13, 14],
      after: [],
    });
  });

  it("renders one panel per window when a day has two", () => {
    const slots = dayWith([10]).map((slot) =>
      slot.time.startsWith("2026-10-08T14") ? { ...slot, away: true, ...host, emoji: "🦷" } : slot
    );
    renderDay(slots);

    expect(screen.getAllByText("ooo_user_is_ooo:Host")).toHaveLength(2);
    expect(hoursAround(screen.getByText("🩺"))).toEqual({ before: [9], after: [11, 12, 13, 15, 16] });
    expect(hoursAround(screen.getByText("🦷"))).toEqual({ before: [9, 11, 12, 13], after: [15, 16] });
  });

  it("shows all booked and the waitlist options for a fully booked day instead of a blank panel", () => {
    render(
      <AvailableTimes
        slots={[]}
        date="2026-10-08"
        bookedTimes={["2026-10-08T10:00:00.000Z"]}
        event={{ data: null }}
      />,
      { mockStore: { eventId: 1 } }
    );

    expect(screen.getByTestId("no-slots-available")).toBeTruthy();
    expect(screen.getByText("waitlist_join_day")).toBeTruthy();
    expect(screen.getByText("waitlist_join_time")).toBeTruthy();
  });

  it("renders only the panel when every slot is away, as a whole-day entry does", () => {
    renderDay(dayWith([9, 10, 11, 12, 13, 14, 15, 16]));

    expect(screen.getAllByText("ooo_user_is_ooo:Host")).toHaveLength(1);
    expect(screen.queryAllByTestId("time")).toHaveLength(0);
  });

  // Before #130 a whole-day day returned the panel alone, with no slot list around it. The expected layout
  // comes from that code, not from a second render through the code under test.
  it("renders a whole-day entry as the panel alone, without the slot list around it", () => {
    const { container } = renderDay(dayWith([9, 10, 11, 12, 13, 14, 15, 16]));

    expect(container.childElementCount).toBe(1);
    expect(container.firstElementChild).toBe(panelOf("ooo_user_is_ooo:Host").parentElement);
  });

  // The out-of-office form does not stop a user from saving two entries that overlap, so two touching runs can
  // share an end. Each entry still gets its own panel and hours.
  it("renders two panels when two overlapping entries end at the same time", () => {
    const slots = dayWith([]).map((slot) => {
      const hour = Number(slot.time.slice(11, 13));
      if (hour >= 9 && hour <= 12) return { ...slot, away: true, ...host, ...windowOf("09:00", "15:00") };
      if (hour >= 13 && hour <= 14) return { ...slot, away: true, ...host, ...windowOf("13:00", "15:00") };
      return slot;
    });
    renderDay(slots);

    expect(screen.getAllByText("ooo_user_is_ooo:Host")).toHaveLength(2);
    expect(isBefore(panelOf("Away 09:00 to 15:00"), panelOf("Away 13:00 to 15:00"))).toBe(true);
  });

  it("renders every slot and no panel on a day without an away entry", () => {
    renderDay(dayWith([]));

    expect(screen.getAllByTestId("time")).toHaveLength(8);
    expect(screen.queryByText("ooo_user_is_ooo:Host")).toBeNull();
  });

  // The last panel of the day drops its bottom padding (from #104), and #130 must not change that.
  it("drops the bottom padding of the last panel of the day, and only there", () => {
    const end = renderDay(dayWith([15, 16]));
    expect(panelOf("ooo_user_is_ooo:Host").parentElement?.classList.contains("pb-0")).toBe(true);
    end.unmount();

    renderDay(dayWith([14, 15]));
    expect(panelOf("ooo_user_is_ooo:Host").parentElement?.classList.contains("pb-0")).toBe(false);
  });

  it("offers the redirect user's booking page on the same date", () => {
    renderDay(dayWith([14, 15], { ...host, toUser: { id: 2, username: "alex", displayName: "Alex" } }));

    fireEvent.click(screen.getByText("ooo_slots_book_with:Alex"));

    expect(push).toHaveBeenCalledWith("/alex?date=2026-10-08");
  });

  it("offers the redirect on the day the run starts when the run crosses midnight UTC", () => {
    // A New York attendee's 8 October runs from 04:00Z on 8 October to 04:00Z on 9 October, so one day column
    // can hold slots on two UTC dates. The away run starts on 8 October, the day the attendee is looking at.
    const away = { away: true, ...host, toUser: { id: 2, username: "alex", displayName: "Alex" } };
    renderDay([
      { time: "2026-10-08T21:00:00.000Z" },
      { time: "2026-10-08T22:00:00.000Z", ...away },
      { time: "2026-10-08T23:00:00.000Z", ...away },
      { time: "2026-10-09T00:00:00.000Z", ...away },
      { time: "2026-10-09T01:00:00.000Z" },
    ]);

    fireEvent.click(screen.getByText("ooo_slots_book_with:Alex"));

    expect(push).toHaveBeenCalledWith("/alex?date=2026-10-08");
  });

  it("shows the public note and hides a private one", () => {
    const { unmount } = renderDay(dayWith([14], { ...host, notes: "Back at four", showNotePublicly: true }));
    expect(screen.getByText("Back at four")).toBeTruthy();
    unmount();

    renderDay(dayWith([14], { ...host, notes: "Back at four", showNotePublicly: false }));
    expect(screen.queryByText("Back at four")).toBeNull();
  });

  describe("hours of the window (issue #130)", () => {
    // The user scenario of #130. A London host (BST, UTC+1) is away 14:00 to 15:00 for the doctor and 15:00 to
    // 16:00 for travel, which is 13:00Z to 14:00Z and 14:00Z to 15:00Z.
    const doctor = {
      ...host,
      notes: "At the doctor",
      showNotePublicly: true,
      toUser: { id: 2, username: "alex", displayName: "Alex" },
      ...windowOf("13:00", "14:00"),
    };
    const travel = {
      ...host,
      emoji: "✈️",
      notes: "On a plane",
      showNotePublicly: true,
      toUser: { id: 3, username: "sam", displayName: "Sam" },
      ...windowOf("14:00", "15:00"),
    };

    it("shows the hours in the attendee's zone and 12-hour format", () => {
      // New York is on EDT (UTC-4) on 2026-10-08.
      bookerTime.timezone = "America/New_York";
      bookerTime.timeFormat = "h:mma";
      renderDay(awayAt(dayWith([]), 13, doctor));

      expect(screen.getByText("Away 9:00am to 10:00am")).toBeTruthy();
    });

    it("updates the hours when the attendee changes the zone or the format", () => {
      bookerTime.timezone = "America/New_York";
      bookerTime.timeFormat = "h:mma";
      const slots = awayAt(dayWith([]), 13, doctor);
      const { rerender } = renderDay(slots);
      expect(screen.getByText("Away 9:00am to 10:00am")).toBeTruthy();

      bookerTime.timeFormat = "HH:mm";
      rerender(<AvailableTimes slots={slots} event={{ data: null }} />);
      expect(screen.getByText("Away 09:00 to 10:00")).toBeTruthy();
      expect(screen.queryByText("Away 9:00am to 10:00am")).toBeNull();

      bookerTime.timezone = "Europe/London";
      rerender(<AvailableTimes slots={slots} event={{ data: null }} />);
      expect(screen.getByText("Away 14:00 to 15:00")).toBeTruthy();
      expect(screen.queryByText("Away 09:00 to 10:00")).toBeNull();
    });

    it("shows the window's real times, not the times of the slots it marks", () => {
      // 30-minute slots. A 14:10 to 14:50 window marks the slots at 14:00 and 14:30.
      const window = { ...host, ...windowOf("14:10", "14:50") };
      const slots: Slot[] = ["13:30", "14:00", "14:30", "15:00"].map((clock) => {
        const time = `2026-10-08T${clock}:00.000Z`;
        return clock === "14:00" || clock === "14:30" ? { time, away: true, ...window } : { time };
      });
      renderDay(slots);

      expect(screen.getAllByText("ooo_user_is_ooo:Host")).toHaveLength(1);
      expect(screen.getByText("Away 14:10 to 14:50")).toBeTruthy();
    });

    it("renders one panel for each of two back-to-back entries, with its own note, redirect and hours", () => {
      bookerTime.timezone = "America/New_York";
      bookerTime.timeFormat = "h:mma";
      renderDay(awayAt(awayAt(dayWith([]), 13, doctor), 14, travel));

      expect(screen.getAllByText("ooo_user_is_ooo:Host")).toHaveLength(2);
      const doctorPanel = panelOf("Away 9:00am to 10:00am");
      const travelPanel = panelOf("Away 10:00am to 11:00am");
      expect(isBefore(doctorPanel, travelPanel)).toBe(true);

      expect(within(doctorPanel).getByText("🩺")).toBeTruthy();
      expect(within(doctorPanel).getByText("At the doctor")).toBeTruthy();
      expect(within(doctorPanel).getByText("ooo_slots_book_with:Alex")).toBeTruthy();
      expect(within(doctorPanel).queryByText("On a plane")).toBeNull();

      expect(within(travelPanel).getByText("✈️")).toBeTruthy();
      expect(within(travelPanel).getByText("On a plane")).toBeTruthy();
      expect(within(travelPanel).getByText("ooo_slots_book_with:Sam")).toBeTruthy();
      expect(within(travelPanel).queryByText("At the doctor")).toBeNull();

      // Slots run up to the first entry and resume after the second one.
      expect(hoursAround(doctorPanel)).toEqual({ before: [9, 10, 11, 12], after: [15, 16] });
      expect(hoursAround(travelPanel)).toEqual({ before: [9, 10, 11, 12], after: [15, 16] });
    });

    it("renders two panels when the gap between two entries is shorter than one slot", () => {
      // One-hour slots. 14:00 to 14:50 marks the 14:00 slot and 15:10 to 16:00 marks the 15:00 slot. Both
      // entries have the same reason, note and emoji, so only the hours tell them apart.
      const first = { ...host, ...windowOf("14:00", "14:50") };
      const second = { ...host, ...windowOf("15:10", "16:00") };
      renderDay(awayAt(awayAt(dayWith([]), 14, first), 15, second));

      expect(screen.getAllByText("ooo_user_is_ooo:Host")).toHaveLength(2);
      expect(isBefore(panelOf("Away 14:00 to 14:50"), panelOf("Away 15:10 to 16:00"))).toBe(true);
    });

    it("starts a new panel when only the end of the window differs", () => {
      const first = { ...host, ...windowOf("13:00", "14:00") };
      const second = { ...host, ...windowOf("13:00", "15:00") };
      renderDay(awayAt(awayAt(dayWith([]), 13, first), 14, second));

      expect(screen.getAllByText("ooo_user_is_ooo:Host")).toHaveLength(2);
      expect(isBefore(panelOf("Away 13:00 to 14:00"), panelOf("Away 13:00 to 15:00"))).toBe(true);
    });

    it("keeps one panel for one window that marks several slots in a row", () => {
      const window = { ...host, ...windowOf("13:00", "15:00") };
      renderDay(awayAt(awayAt(dayWith([]), 13, window), 14, window));

      expect(screen.getAllByText("ooo_user_is_ooo:Host")).toHaveLength(1);
      expect(screen.getAllByText("Away 13:00 to 15:00")).toHaveLength(1);
    });

    it("renders one panel for each window when two windows together cover every slot", () => {
      const morning = { ...host, ...windowOf("09:00", "13:00") };
      const afternoon = { ...host, emoji: "✈️", ...windowOf("13:00", "17:00") };
      const slots = dayWith([9, 10, 11, 12], morning).map((slot) =>
        slot.away ? slot : { ...slot, away: true, ...afternoon }
      );
      renderDay(slots);

      expect(screen.queryAllByTestId("time")).toHaveLength(0);
      expect(screen.getAllByText("ooo_user_is_ooo:Host")).toHaveLength(2);
      expect(isBefore(panelOf("Away 09:00 to 13:00"), panelOf("Away 13:00 to 17:00"))).toBe(true);
    });

    it("keeps the whole-day layout and adds the hours when one window covers every slot", () => {
      const wholeDay = renderDay(dayWith([9, 10, 11, 12, 13, 14, 15, 16]));
      const wholeDayLayout = wholeDay.container.firstElementChild?.className;
      wholeDay.unmount();

      const { container } = renderDay(
        dayWith([9, 10, 11, 12, 13, 14, 15, 16], { ...host, ...windowOf("09:00", "17:00") })
      );

      expect(screen.queryAllByTestId("time")).toHaveLength(0);
      expect(screen.getAllByText("ooo_user_is_ooo:Host")).toHaveLength(1);
      expect(screen.getByText("Away 09:00 to 17:00")).toBeTruthy();
      expect(container.childElementCount).toBe(1);
      expect(container.firstElementChild?.className).toBe(wholeDayLayout);
    });

    it("shows no hours for a whole-day entry", () => {
      renderDay(dayWith([9, 10, 11, 12, 13, 14, 15, 16]));

      expect(screen.getAllByText("ooo_user_is_ooo:Host")).toHaveLength(1);
      expect(screen.queryByText(/^Away /)).toBeNull();
    });

    it("shows no hours on a holiday panel", () => {
      const holiday = { reason: "Christmas", emoji: "🎄", ...windowOf("09:00", "17:00") };
      renderDay(dayWith([9, 10, 11, 12, 13, 14, 15, 16], holiday));

      expect(screen.getByText("Christmas")).toBeTruthy();
      expect(screen.getByText("holiday_no_availability")).toBeTruthy();
      expect(screen.queryByText(/^Away /)).toBeNull();
    });

    it("shows the full hours with dates on both days when the window crosses the attendee's midnight", () => {
      // 13:00Z to 15:30Z. Tokyo is UTC+9, so the window is 22:00 on Oct 8 to 00:30 on Oct 9 there. The
      // 13:00Z and 14:00Z slots are on the attendee's Oct 8, and the 15:00Z slot is on Oct 9.
      bookerTime.timezone = "Asia/Tokyo";
      const window = { ...host, ...windowOf("13:00", "15:30") };
      const firstDay = renderDay(awayAt(awayAt(dayWith([]), 13, window), 14, window).slice(0, 6));
      expect(screen.getAllByText("Away Oct 8, 22:00 to Oct 9, 00:30")).toHaveLength(1);
      firstDay.unmount();

      renderDay(awayAt(dayWith([]), 15, window).slice(6));
      expect(screen.getAllByText("Away Oct 8, 22:00 to Oct 9, 00:30")).toHaveLength(1);
    });
  });
});
