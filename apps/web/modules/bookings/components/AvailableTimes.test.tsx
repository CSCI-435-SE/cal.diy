import { render } from "@calcom/features/bookings/Booker/__tests__/test-utils";
import type { Slots } from "@calcom/features/bookings/types";
import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AvailableTimes } from "./AvailableTimes";

const push = vi.fn();

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
  useBookerTime: () => ({ timeFormat: "HH:mm", timezone: "UTC" }),
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
    t: (key: string, values?: { displayName?: string }) =>
      values?.displayName ? `${key}:${values.displayName}` : key,
    isLocaleReady: true,
    i18n: {},
  }),
}));

// The server sends `notes` on an away slot and the panel reads it, but SlotInfo (calendars/lib/types.ts) does not list it.
type Slot = Slots[string][number] & { notes?: string | null };

const host = { fromUser: { id: 1, displayName: "Host" }, emoji: "🩺", showNotePublicly: false };

// 09:00 to 16:00 UTC on 2026-10-08, one slot an hour. The hours listed are away.
const dayWith = (awayHours: number[], awayData: Partial<Slot> = host): Slot[] =>
  Array.from({ length: 8 }, (_, index) => {
    const hour = 9 + index;
    const time = `2026-10-08T${String(hour).padStart(2, "0")}:00:00.000Z`;
    return awayHours.includes(hour) ? { time, away: true, ...awayData } : { time };
  });

const renderDay = (slots: Slot[]) => render(<AvailableTimes slots={slots} event={{ data: null }} />);

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

  it("offers the redirect user's booking page on the same date", () => {
    renderDay(dayWith([14, 15], { ...host, toUser: { id: 2, username: "alex", displayName: "Alex" } }));

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
});
