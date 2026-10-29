import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, RefObject } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SlotDragMode, SlotSelectionChange } from "../lib/weekly-grid";
import { applyDragToSlots, getAutoScrollSpeed } from "../lib/weekly-grid";

const MINUTES_PER_DAY = 24 * 60;

// Touch drags wait for a long press so a finger swiping across the grid scrolls instead of selecting
const LONG_PRESS_MS = 350;
const LONG_PRESS_MOVE_TOLERANCE_PX = 8;

type DragState = {
  pointerId: number;
  day: number;
  anchorSlot: number;
  currentSlot: number;
  mode: SlotDragMode;
};

type PendingTouchHold = {
  drag: DragState;
  startX: number;
  startY: number;
  timer: ReturnType<typeof setTimeout>;
};

type UseWeeklyGridDragOptions = {
  value: boolean[][];
  intervalMinutes: number;
  onSelectionChange?: (change: WeeklyGridSelectionChange) => void;
  /** The element holding all slot rows; its height maps pointer Y positions to slots */
  rowsRef: RefObject<HTMLElement | null>;
  scrollContainerRef: RefObject<HTMLElement | null>;
};

function readCellPosition(target: EventTarget | null): { day: number; slot: number } | null {
  if (!(target instanceof Element)) return null;
  const cell = target.closest<HTMLElement>("[data-day][data-slot]");
  if (!cell) return null;
  const day = Number(cell.dataset.day);
  const slot = Number(cell.dataset.slot);
  if (Number.isNaN(day) || Number.isNaN(slot)) return null;
  return { day, slot };
}

function hasSelectionChanged(before: boolean[], after: boolean[]): boolean {
  return after.some((isSelected, slot) => isSelected !== (before[slot] ?? false));
}

/**
 * Scrolls the container while the pointer rests near its top or bottom edge, calling `onScroll`
 * after each step because content moving under a still pointer changes the hovered slot.
 */
function useEdgeAutoScroll(
  scrollContainerRef: RefObject<HTMLElement | null>,
  pointerYRef: { current: number },
  onScroll: () => void
) {
  const frameRef = useRef<number | null>(null);

  const speed = useCallback((): number => {
    const container = scrollContainerRef.current;
    if (!container) return 0;
    const { top, bottom } = container.getBoundingClientRect();
    return getAutoScrollSpeed(pointerYRef.current, top, bottom);
  }, [scrollContainerRef, pointerYRef]);

  const stop = useCallback(() => {
    if (frameRef.current === null) return;
    cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
  }, []);

  const step = useCallback(() => {
    const container = scrollContainerRef.current;
    const currentSpeed = speed();
    if (!container || currentSpeed === 0) {
      frameRef.current = null;
      return;
    }
    container.scrollTop += currentSpeed;
    onScroll();
    frameRef.current = requestAnimationFrame(step);
  }, [onScroll, scrollContainerRef, speed]);

  const startIfNeeded = useCallback(() => {
    if (frameRef.current !== null || speed() === 0) return;
    frameRef.current = requestAnimationFrame(step);
  }, [speed, step]);

  useEffect(() => stop, [stop]);

  return { startIfNeeded, stop };
}

export type WeeklyGridSelectionChange = SlotSelectionChange & { day: number };

export function useWeeklyGridDrag({
  value,
  intervalMinutes,
  onSelectionChange,
  rowsRef,
  scrollContainerRef,
}: UseWeeklyGridDragOptions) {
  const slotsPerDay = MINUTES_PER_DAY / intervalMinutes;
  const [drag, setDrag] = useState<DragState | null>(null);
  // Refs mirror the latest drag/pointer so the auto-scroll animation loop never reads stale state
  const dragRef = useRef<DragState | null>(null);
  const pointerYRef = useRef(0);

  const slotsForDay = useCallback(
    (day: number): boolean[] => value[day] ?? new Array<boolean>(slotsPerDay).fill(false),
    [value, slotsPerDay]
  );

  const updateDrag = useCallback((next: DragState | null) => {
    dragRef.current = next;
    setDrag(next);
  }, []);

  // Only the vertical position matters: drags stay in the starting day's column
  const followPointer = useCallback(() => {
    const current = dragRef.current;
    const rows = rowsRef.current;
    if (!current || !rows) return;
    const { top, height } = rows.getBoundingClientRect();
    if (height <= 0) return;
    const rawSlot = Math.floor(((pointerYRef.current - top) / height) * slotsPerDay);
    const slot = Math.min(slotsPerDay - 1, Math.max(0, rawSlot));
    if (slot !== current.currentSlot) updateDrag({ ...current, currentSlot: slot });
  }, [rowsRef, slotsPerDay, updateDrag]);

  const autoScroll = useEdgeAutoScroll(scrollContainerRef, pointerYRef, followPointer);

  const endDrag = useCallback(() => {
    autoScroll.stop();
    updateDrag(null);
  }, [autoScroll, updateDrag]);

  const pendingTouchHoldRef = useRef<PendingTouchHold | null>(null);

  const cancelTouchHold = useCallback(() => {
    if (pendingTouchHoldRef.current) clearTimeout(pendingTouchHoldRef.current.timer);
    pendingTouchHoldRef.current = null;
  }, []);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!onSelectionChange) return;
      if (!event.isPrimary || pendingTouchHoldRef.current || dragRef.current) {
        // A second contact means a pinch or multi-touch gesture, so the hold or drag the first one
        // started is abandoned rather than committed
        cancelTouchHold();
        endDrag();
        return;
      }
      if (event.pointerType === "mouse" && event.button !== 0) return;
      const position = readCellPosition(event.target);
      if (!position) return;

      const drag: DragState = {
        pointerId: event.pointerId,
        day: position.day,
        anchorSlot: position.slot,
        currentSlot: position.slot,
        mode: value[position.day]?.[position.slot] ? "deselect" : "select",
      };

      if (event.pointerType === "touch") {
        // No preventDefault or capture yet: the browser must stay free to scroll until the hold completes
        cancelTouchHold();
        const rows = event.currentTarget;
        const timer = setTimeout(() => {
          pendingTouchHoldRef.current = null;
          try {
            // Implicit touch capture is only a SHOULD in the spec; this keeps events on the rows everywhere
            rows.setPointerCapture?.(drag.pointerId);
          } catch {
            // The pointer may already be gone; implicit capture to the pressed cell still reaches the rows
          }
          updateDrag(drag);
        }, LONG_PRESS_MS);
        pendingTouchHoldRef.current = { drag, startX: event.clientX, startY: event.clientY, timer };
        return;
      }

      // Stops text selection and native drag-and-drop from starting
      event.preventDefault();
      event.currentTarget.setPointerCapture?.(event.pointerId);
      pointerYRef.current = event.clientY;
      updateDrag(drag);
    },
    [cancelTouchHold, endDrag, onSelectionChange, updateDrag, value]
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const hold = pendingTouchHoldRef.current;
      if (hold?.drag.pointerId === event.pointerId) {
        const distance = Math.hypot(event.clientX - hold.startX, event.clientY - hold.startY);
        if (distance > LONG_PRESS_MOVE_TOLERANCE_PX) cancelTouchHold();
        return;
      }
      if (dragRef.current?.pointerId !== event.pointerId) return;
      pointerYRef.current = event.clientY;
      followPointer();
      autoScroll.startIfNeeded();
    },
    [autoScroll, cancelTouchHold, followPointer]
  );

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      let current = dragRef.current;
      const hold = pendingTouchHoldRef.current;
      if (hold?.drag.pointerId === event.pointerId) {
        // A quick tap is a drag that never moved, so it toggles one slot like a mouse click
        cancelTouchHold();
        current = hold.drag;
      }
      if (current?.pointerId !== event.pointerId) return;
      endDrag();

      const before = slotsForDay(current.day);
      const after = applyDragToSlots(before, current.anchorSlot, current.currentSlot, current.mode);
      if (!hasSelectionChanged(before, after)) return;

      const firstSlot = Math.min(current.anchorSlot, current.currentSlot);
      const lastSlot = Math.max(current.anchorSlot, current.currentSlot);
      onSelectionChange?.({
        day: current.day,
        startMinute: firstSlot * intervalMinutes,
        endMinute: (lastSlot + 1) * intervalMinutes,
        mode: current.mode,
      });
    },
    [cancelTouchHold, endDrag, intervalMinutes, onSelectionChange, slotsForDay]
  );

  const onPointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (pendingTouchHoldRef.current?.drag.pointerId === event.pointerId) cancelTouchHold();
      if (dragRef.current?.pointerId === event.pointerId) endDrag();
    },
    [cancelTouchHold, endDrag]
  );

  // Only blocks the long-press menu during a touch hold or drag, so desktop right-click keeps its menu
  const onContextMenu = useCallback((event: ReactMouseEvent<HTMLElement>) => {
    const isTouch = "pointerType" in event.nativeEvent && event.nativeEvent.pointerType === "touch";
    if (isTouch || pendingTouchHoldRef.current || dragRef.current) event.preventDefault();
  }, []);

  useEffect(() => {
    const rows = rowsRef.current;
    // React's touch listeners are passive, so only a native one can stop the page scrolling under a drag
    const preventScrollWhileDragging = (event: TouchEvent) => {
      if (dragRef.current && event.cancelable) event.preventDefault();
    };
    rows?.addEventListener("touchmove", preventScrollWhileDragging, { passive: false });
    return () => {
      rows?.removeEventListener("touchmove", preventScrollWhileDragging);
      cancelTouchHold();
    };
  }, [cancelTouchHold, rowsRef]);

  const preview = useMemo(() => {
    if (!drag) return null;
    return {
      day: drag.day,
      slots: applyDragToSlots(slotsForDay(drag.day), drag.anchorSlot, drag.currentSlot, drag.mode),
    };
  }, [drag, slotsForDay]);

  const getDisplaySlots = useCallback(
    (day: number): boolean[] => (preview?.day === day ? preview.slots : slotsForDay(day)),
    [preview, slotsForDay]
  );

  return {
    isDragging: drag !== null,
    getDisplaySlots,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onContextMenu,
    },
  };
}
