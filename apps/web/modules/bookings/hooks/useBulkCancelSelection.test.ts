import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { BookingOutput } from "../types";
import { useBulkCancelSelection } from "./useBulkCancelSelection";

const booking = (uid: string, overrides: Record<string, unknown> = {}) =>
  ({
    uid,
    status: "ACCEPTED",
    endTime: new Date(Date.now() + 86_400_000).toISOString(),
    user: { id: 1 },
    eventType: { disableCancelling: false },
    ...overrides,
  }) as unknown as BookingOutput;

const setup = (bookings: BookingOutput[], enabled = true) =>
  renderHook((props) => useBulkCancelSelection(props), {
    initialProps: { bookings, enabled, userId: 1, resetKey: "page-1" },
  });

describe("useBulkCancelSelection", () => {
  it("caps the selection and select-all at 10 bookings", () => {
    const { result } = setup(Array.from({ length: 12 }, (_, i) => booking(`b${i}`)));

    act(() => result.current.selectAll());
    expect(result.current.selectedBookings).toHaveLength(10);
    expect(result.current.selection?.canSelectMore).toBe(false);

    act(() => result.current.selection?.onToggle("b11"));
    expect(result.current.selection?.isSelected("b11")).toBe(false);
  });

  it("drops cancelled or vanished bookings and clears on page, filter or tab changes", () => {
    const { result, rerender } = setup([booking("a"), booking("b"), booking("c")]);
    act(() => result.current.selectAll());
    act(() => result.current.deselect(["c"]));

    rerender({ bookings: [booking("a")], enabled: true, userId: 1, resetKey: "page-1" });
    expect(result.current.selectedBookings.map((b) => b.uid)).toEqual(["a"]);

    rerender({ bookings: [booking("a")], enabled: true, userId: 1, resetKey: "page-2" });
    expect(result.current.selectedBookings).toEqual([]);

    rerender({ bookings: [booking("a")], enabled: false, userId: 1, resetKey: "past-tab" });
    expect(result.current.selection).toBeUndefined();
  });
});
