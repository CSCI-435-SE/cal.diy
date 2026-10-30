import { act, fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installPointerEventPolyfill } from "../test-utils/pointer-events";
import type { WeeklyGridSelectionChange } from "./useWeeklyGridDrag";
import { useWeeklyGridDrag } from "./useWeeklyGridDrag";

const SLOTS_PER_DAY = 96;
const SLOT_HEIGHT = 10;
const SCROLL_BOX_HEIGHT = 600;

installPointerEventPolyfill();

const SLOT_NUMBERS = Array.from({ length: SLOTS_PER_DAY }, (_, slot) => slot);

const emptyWeek = () => Array.from({ length: 7 }, () => new Array<boolean>(SLOTS_PER_DAY).fill(false));

function Harness({
  value,
  onSelectionChange,
}: {
  value: boolean[][];
  onSelectionChange?: (change: WeeklyGridSelectionChange) => void;
}) {
  const rowsRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { getDisplaySlots, handlers } = useWeeklyGridDrag({
    value,
    intervalMinutes: 15,
    onSelectionChange,
    rowsRef,
    scrollContainerRef: scrollRef,
  });

  return (
    <div ref={scrollRef} data-testid="scroll">
      <div ref={rowsRef} data-testid="rows" {...handlers}>
        {[0, 1].map((day) =>
          SLOT_NUMBERS.map((slot) => (
            <div
              key={`${day}-${slot}`}
              data-day={day}
              data-slot={slot}
              data-testid={`cell-${day}-${slot}`}
              data-selected={getDisplaySlots(day)[slot]}
            />
          ))
        )}
      </div>
    </div>
  );
}

const slotY = (slot: number) => slot * SLOT_HEIGHT + SLOT_HEIGHT / 2;
const cell = (day: number, slot: number) => screen.getByTestId(`cell-${day}-${slot}`);
const isSelected = (day: number, slot: number) => cell(day, slot).getAttribute("data-selected") === "true";

const pointer = { pointerId: 1, isPrimary: true, pointerType: "mouse", button: 0 };
const pressAt = (day: number, slot: number, init: Partial<PointerEventInit> = {}) =>
  fireEvent.pointerDown(cell(day, slot), { ...pointer, clientY: slotY(slot), ...init });
const moveTo = (clientY: number) =>
  fireEvent.pointerMove(screen.getByTestId("rows"), { ...pointer, clientY });
const release = () => fireEvent.pointerUp(screen.getByTestId("rows"), pointer);

describe("useWeeklyGridDrag", () => {
  let scrollTop = 0;
  let frames: FrameRequestCallback[] = [];

  beforeEach(() => {
    scrollTop = 0;
    frames = [];
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      const testId = this.getAttribute("data-testid");
      if (testId === "rows") {
        // Rows move up as the container scrolls down
        const top = -scrollTop;
        return {
          top,
          bottom: top + SLOTS_PER_DAY * SLOT_HEIGHT,
          height: SLOTS_PER_DAY * SLOT_HEIGHT,
        } as DOMRect;
      }
      if (testId === "scroll") {
        return { top: 0, bottom: SCROLL_BOX_HEIGHT, height: SCROLL_BOX_HEIGHT } as DOMRect;
      }
      return { top: 0, bottom: 0, height: 0 } as DOMRect;
    });
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderHarness = (value = emptyWeek(), onSelectionChange = vi.fn()) => {
    render(<Harness value={value} onSelectionChange={onSelectionChange} />);
    Object.defineProperty(screen.getByTestId("scroll"), "scrollTop", {
      get: () => scrollTop,
      set: (next: number) => {
        scrollTop = next;
      },
    });
    return onSelectionChange;
  };

  it("previews the dragged slots and commits them on release", () => {
    const onSelectionChange = renderHarness();

    pressAt(1, 36);
    moveTo(slotY(39));

    expect([36, 37, 38, 39].every((slot) => isSelected(1, slot))).toBe(true);
    expect(isSelected(1, 40)).toBe(false);
    expect(onSelectionChange).not.toHaveBeenCalled();

    release();

    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    expect(onSelectionChange).toHaveBeenCalledWith({
      day: 1,
      startMinute: 540,
      endMinute: 600,
      mode: "select",
    });
  });

  it("deselects when the drag starts on a selected slot", () => {
    const value = emptyWeek();
    for (let slot = 36; slot < 52; slot++) value[1][slot] = true;
    const onSelectionChange = renderHarness(value);

    pressAt(1, 44);
    moveTo(slotY(47));

    expect(isSelected(1, 44)).toBe(false);
    expect(isSelected(1, 47)).toBe(false);
    expect(isSelected(1, 43)).toBe(true);

    release();

    expect(onSelectionChange).toHaveBeenCalledWith({
      day: 1,
      startMinute: 660,
      endMinute: 720,
      mode: "deselect",
    });
  });

  it("selects upwards when dragging above the starting slot", () => {
    const onSelectionChange = renderHarness();

    pressAt(0, 40);
    moveTo(slotY(38));
    release();

    expect(onSelectionChange).toHaveBeenCalledWith({
      day: 0,
      startMinute: 570,
      endMinute: 615,
      mode: "select",
    });
  });

  it("toggles a single slot on click", () => {
    const onSelectionChange = renderHarness();

    pressAt(1, 36);
    release();

    expect(onSelectionChange).toHaveBeenCalledWith({
      day: 1,
      startMinute: 540,
      endMinute: 555,
      mode: "select",
    });
  });

  it("only changes the day the drag started on", () => {
    renderHarness();

    pressAt(0, 10);
    fireEvent.pointerMove(cell(1, 12), { ...pointer, clientY: slotY(12) });

    expect(isSelected(0, 12)).toBe(true);
    expect(isSelected(1, 12)).toBe(false);
  });

  it("clamps the drag to the end of the day", () => {
    const onSelectionChange = renderHarness();

    pressAt(1, 92);
    moveTo(5000);
    release();

    expect(onSelectionChange).toHaveBeenCalledWith({
      day: 1,
      startMinute: 1380,
      endMinute: 1440,
      mode: "select",
    });
  });

  it("reverts the preview without committing when the pointer is cancelled", () => {
    const onSelectionChange = renderHarness();

    pressAt(1, 36);
    moveTo(slotY(40));
    fireEvent.pointerCancel(screen.getByTestId("rows"), pointer);

    expect(isSelected(1, 36)).toBe(false);
    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it("ignores non-primary mouse buttons", () => {
    const onSelectionChange = renderHarness();

    pressAt(1, 36, { button: 2 });
    release();

    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it("is read-only without a change handler", () => {
    render(<Harness value={emptyWeek()} />);

    pressAt(1, 36);
    moveTo(slotY(40));

    expect(isSelected(1, 36)).toBe(false);
  });

  it("auto-scrolls near the bottom edge and keeps extending the selection", () => {
    const onSelectionChange = renderHarness();

    pressAt(1, 50);
    moveTo(SCROLL_BOX_HEIGHT - 5);
    expect(frames).toHaveLength(1);

    act(() => frames[0](0));

    expect(scrollTop).toBeGreaterThan(0);
    const slotUnderPointer = Math.floor((SCROLL_BOX_HEIGHT - 5 + scrollTop) / SLOT_HEIGHT);
    expect(isSelected(1, slotUnderPointer)).toBe(true);

    release();
    expect(onSelectionChange).toHaveBeenCalledWith(
      expect.objectContaining({ day: 1, startMinute: 750, endMinute: (slotUnderPointer + 1) * 15 })
    );
  });

  it("does not auto-scroll away from the edges", () => {
    renderHarness();

    pressAt(1, 20);
    moveTo(slotY(25));

    expect(frames).toHaveLength(0);
  });

  describe("touch", () => {
    const LONG_PRESS_MS = 350;
    const finger = { pointerId: 1, isPrimary: true, pointerType: "touch", button: 0 };
    const secondFinger = { pointerId: 2, isPrimary: false, pointerType: "touch", button: 0 };
    const rows = () => screen.getByTestId("rows");
    const moveFingerTo = (clientY: number) => fireEvent.pointerMove(rows(), { ...finger, clientY });

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    const touchMoveIsPrevented = () =>
      !rows().dispatchEvent(new Event("touchmove", { bubbles: true, cancelable: true }));

    it("waits the full long press before a touch starts dragging", () => {
      renderHarness();

      pressAt(1, 36, finger);
      act(() => vi.advanceTimersByTime(LONG_PRESS_MS - 1));
      expect(isSelected(1, 36)).toBe(false);

      act(() => vi.advanceTimersByTime(1));
      expect(isSelected(1, 36)).toBe(true);

      moveFingerTo(slotY(40));
      expect(isSelected(1, 40)).toBe(true);
    });

    it("commits a long-press drag on release", () => {
      const onSelectionChange = renderHarness();

      pressAt(1, 36, finger);
      act(() => vi.advanceTimersByTime(LONG_PRESS_MS));
      moveFingerTo(slotY(39));
      fireEvent.pointerUp(rows(), finger);

      expect(onSelectionChange).toHaveBeenCalledWith({
        day: 1,
        startMinute: 540,
        endMinute: 600,
        mode: "select",
      });
    });

    it("deselects when a long-press drag starts on a selected slot", () => {
      const value = emptyWeek();
      for (let slot = 36; slot < 52; slot++) value[1][slot] = true;
      const onSelectionChange = renderHarness(value);

      pressAt(1, 44, finger);
      act(() => vi.advanceTimersByTime(LONG_PRESS_MS));
      moveFingerTo(slotY(47));
      fireEvent.pointerUp(rows(), finger);

      expect(onSelectionChange).toHaveBeenCalledWith(expect.objectContaining({ day: 1, mode: "deselect" }));
    });

    it("cancels the hold when the finger moves past the tolerance", () => {
      const onSelectionChange = renderHarness();

      pressAt(1, 36, finger);
      moveFingerTo(slotY(36) + 9);
      act(() => vi.advanceTimersByTime(LONG_PRESS_MS));
      moveFingerTo(slotY(40));

      expect(isSelected(1, 36)).toBe(false);
      expect(isSelected(1, 40)).toBe(false);

      fireEvent.pointerUp(rows(), finger);
      expect(onSelectionChange).not.toHaveBeenCalled();
    });

    it("keeps the hold when the finger jitters within the tolerance", () => {
      renderHarness();

      pressAt(1, 36, finger);
      moveFingerTo(slotY(36) + 8);
      act(() => vi.advanceTimersByTime(LONG_PRESS_MS));

      expect(isSelected(1, 36)).toBe(true);
    });

    it("toggles a single slot on a quick tap", () => {
      const onSelectionChange = renderHarness();

      pressAt(1, 36, finger);
      fireEvent.pointerUp(rows(), finger);
      act(() => vi.advanceTimersByTime(LONG_PRESS_MS));

      expect(onSelectionChange).toHaveBeenCalledTimes(1);
      expect(onSelectionChange).toHaveBeenCalledWith({
        day: 1,
        startMinute: 540,
        endMinute: 555,
        mode: "select",
      });
      expect(isSelected(1, 36)).toBe(false);
    });

    it("drops the hold when the browser takes over the touch to scroll", () => {
      const onSelectionChange = renderHarness();

      pressAt(1, 36, finger);
      fireEvent.pointerCancel(rows(), finger);
      act(() => vi.advanceTimersByTime(LONG_PRESS_MS));

      expect(isSelected(1, 36)).toBe(false);
      fireEvent.pointerUp(rows(), finger);
      expect(onSelectionChange).not.toHaveBeenCalled();
    });

    it("ignores pointercancel from a different pointer", () => {
      renderHarness();

      pressAt(1, 36, finger);
      act(() => vi.advanceTimersByTime(LONG_PRESS_MS));
      fireEvent.pointerCancel(rows(), { ...finger, pointerId: 7 });
      moveFingerTo(slotY(40));

      expect(isSelected(1, 40)).toBe(true);
    });

    it("only blocks touch scrolling while a drag is active", () => {
      renderHarness();

      expect(touchMoveIsPrevented()).toBe(false);

      pressAt(1, 36, finger);
      expect(touchMoveIsPrevented()).toBe(false);

      act(() => vi.advanceTimersByTime(LONG_PRESS_MS));
      expect(touchMoveIsPrevented()).toBe(true);

      fireEvent.pointerUp(rows(), finger);
      expect(touchMoveIsPrevented()).toBe(false);
    });

    it("blocks the context menu during a hold but not for an idle mouse", () => {
      renderHarness();

      expect(fireEvent.contextMenu(cell(1, 36))).toBe(true);

      pressAt(1, 36, finger);
      expect(fireEvent.contextMenu(cell(1, 36))).toBe(false);
    });

    it("starts mouse and pen drags immediately without a hold", () => {
      renderHarness();

      pressAt(1, 36, { pointerType: "pen" });
      expect(isSelected(1, 36)).toBe(true);
      fireEvent.pointerUp(rows(), { ...pointer, pointerType: "pen" });

      pressAt(0, 10);
      expect(isSelected(0, 10)).toBe(true);
    });

    it("auto-scrolls during a long-press drag near the bottom edge", () => {
      renderHarness();

      pressAt(1, 50, finger);
      act(() => vi.advanceTimersByTime(LONG_PRESS_MS));
      moveFingerTo(SCROLL_BOX_HEIGHT - 5);

      expect(frames).toHaveLength(1);
      act(() => frames[0](0));
      expect(scrollTop).toBeGreaterThan(0);
    });

    it("cancels an active drag without committing when a second finger touches down", () => {
      const onSelectionChange = renderHarness();

      pressAt(1, 36, finger);
      act(() => vi.advanceTimersByTime(LONG_PRESS_MS));
      moveFingerTo(slotY(40));
      expect(isSelected(1, 40)).toBe(true);

      fireEvent.pointerDown(cell(1, 60), { ...secondFinger, clientY: slotY(60) });

      expect(isSelected(1, 36)).toBe(false);
      expect(isSelected(1, 40)).toBe(false);

      moveFingerTo(slotY(45));
      expect(isSelected(1, 45)).toBe(false);

      fireEvent.pointerUp(rows(), secondFinger);
      fireEvent.pointerUp(rows(), finger);
      expect(onSelectionChange).not.toHaveBeenCalled();
    });

    it("never starts a drag when a second finger touches down during the hold", () => {
      const onSelectionChange = renderHarness();

      pressAt(1, 36, finger);
      act(() => vi.advanceTimersByTime(LONG_PRESS_MS - 100));
      fireEvent.pointerDown(cell(1, 60), { ...secondFinger, clientY: slotY(60) });
      act(() => vi.advanceTimersByTime(LONG_PRESS_MS));

      moveFingerTo(slotY(40));
      expect(isSelected(1, 36)).toBe(false);
      expect(isSelected(1, 40)).toBe(false);

      fireEvent.pointerUp(rows(), finger);
      expect(onSelectionChange).not.toHaveBeenCalled();
    });
  });
});
