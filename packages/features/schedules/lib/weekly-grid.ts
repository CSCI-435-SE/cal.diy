import type { TimeRange } from "@calcom/types/schedule";

const MINUTES_PER_DAY = 24 * 60;
const FALLBACK_INTERVAL_MINUTES = 15;
// The dropdowns offer 23:59 as the latest end time, meaning "end of day"
const END_OF_DAY_MINUTES = MINUTES_PER_DAY - 1;

type MinuteRange = { startMinute: number; endMinute: number; range: TimeRange };

function toMinutesOfDay(date: Date): number {
  // Schedule times are stored as dates where only the UTC hour/minute are meaningful
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

function toEndMinutes(date: Date): number {
  const minutes = toMinutesOfDay(date);
  return minutes === END_OF_DAY_MINUTES ? MINUTES_PER_DAY : minutes;
}

function toMinuteRange(range: TimeRange): MinuteRange {
  return {
    startMinute: toMinutesOfDay(new Date(range.start)),
    endMinute: toEndMinutes(new Date(range.end)),
    range,
  };
}

/**
 * Builds a time on today's UTC date, matching how the time dropdowns and the server
 * transformer create range dates, so the dropdowns recognise the value as one of their options.
 */
function minuteToDate(minute: number, now: Date): Date {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const date = now.getUTCDate();
  if (minute >= MINUTES_PER_DAY) {
    return new Date(Date.UTC(year, month, date, 23, 59, 59, 999));
  }
  return new Date(Date.UTC(year, month, date, 0, minute));
}

function byStartMinute(a: MinuteRange, b: MinuteRange): number {
  return a.startMinute - b.startMinute;
}

export type SlotDragMode = "select" | "deselect";

export type SlotSelectionChange = {
  startMinute: number;
  /** Exclusive; 1440 means end of day */
  endMinute: number;
  mode: SlotDragMode;
};

/**
 * Grid cells must line up with hour boundaries so hour lines and labels never
 * fall inside a cell, so only intervals that divide an hour evenly are allowed.
 */
export function resolveSlotInterval(intervalMinutes: number): number {
  if (Number.isInteger(intervalMinutes) && intervalMinutes > 0 && 60 % intervalMinutes === 0) {
    return intervalMinutes;
  }
  return FALLBACK_INTERVAL_MINUTES;
}

export function getSlotsPerDay(intervalMinutes: number): number {
  return MINUTES_PER_DAY / resolveSlotInterval(intervalMinutes);
}

/**
 * Converts the availability form's schedule (Sunday-indexed list of time ranges per day)
 * into a 7 × slotsPerDay matrix where `true` means the slot overlaps an available range.
 */
export function scheduleToSlotGrid(schedule: TimeRange[][], intervalMinutes: number): boolean[][] {
  const interval = resolveSlotInterval(intervalMinutes);
  const slotsPerDay = MINUTES_PER_DAY / interval;
  const grid: boolean[][] = [];

  for (let day = 0; day < 7; day++) {
    const slots = new Array<boolean>(slotsPerDay).fill(false);
    for (const range of schedule[day] ?? []) {
      const { startMinute, endMinute } = toMinuteRange(range);
      const firstSlot = Math.floor(startMinute / interval);
      const lastSlotExclusive = Math.min(Math.ceil(endMinute / interval), slotsPerDay);
      for (let slot = firstSlot; slot < lastSlotExclusive; slot++) {
        slots[slot] = true;
      }
    }
    grid.push(slots);
  }

  return grid;
}

/**
 * Live preview of an in-progress drag: every slot between the anchor and the current
 * slot (inclusive, in either direction) takes the drag's mode.
 */
export function applyDragToSlots(
  slots: boolean[],
  anchorSlot: number,
  currentSlot: number,
  mode: SlotDragMode
): boolean[] {
  const next = [...slots];
  const from = Math.max(0, Math.min(anchorSlot, currentSlot));
  const to = Math.min(slots.length - 1, Math.max(anchorSlot, currentSlot));
  for (let slot = from; slot <= to; slot++) {
    next[slot] = mode === "select";
  }
  return next;
}

/**
 * Applies a finished drag to one day's time ranges, changing only what the dragged span touches.
 * Ranges outside the span keep their exact dates, so custom times (e.g. 9:10) and the user's own
 * row structure in the text fields survive edits elsewhere in the day.
 */
export function applyDragToTimeRanges(
  ranges: TimeRange[],
  change: SlotSelectionChange,
  now: Date = new Date()
): TimeRange[] {
  const { startMinute, endMinute, mode } = change;
  const existing = ranges.map(toMinuteRange);
  const result: MinuteRange[] = [];

  if (mode === "select") {
    let mergedStart = startMinute;
    let mergedEnd = endMinute;
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    for (const item of existing) {
      const touchesSpan = item.startMinute <= endMinute && item.endMinute >= startMinute;
      if (!touchesSpan) {
        result.push(item);
        continue;
      }
      if (item.startMinute <= mergedStart) {
        mergedStart = item.startMinute;
        startDate = item.range.start;
      }
      if (item.endMinute >= mergedEnd) {
        mergedEnd = item.endMinute;
        endDate = item.range.end;
      }
    }

    result.push({
      startMinute: mergedStart,
      endMinute: mergedEnd,
      range: {
        start: startDate ?? minuteToDate(mergedStart, now),
        end: endDate ?? minuteToDate(mergedEnd, now),
      },
    });
  } else {
    for (const item of existing) {
      const overlapsSpan = item.startMinute < endMinute && item.endMinute > startMinute;
      if (!overlapsSpan) {
        result.push(item);
        continue;
      }
      if (item.startMinute < startMinute) {
        result.push({
          startMinute: item.startMinute,
          endMinute: startMinute,
          range: { ...item.range, end: minuteToDate(startMinute, now) },
        });
      }
      if (item.endMinute > endMinute) {
        result.push({
          startMinute: endMinute,
          endMinute: item.endMinute,
          range: { ...item.range, start: minuteToDate(endMinute, now) },
        });
      }
    }
  }

  return result.sort(byStartMinute).map((item) => item.range);
}

/**
 * Scroll speed (px per frame) while dragging near the scroll container's edges:
 * negative near the top, positive near the bottom, faster the closer to the edge.
 */
export function getAutoScrollSpeed(
  pointerY: number,
  top: number,
  bottom: number,
  edgeSize = 40,
  maxSpeed = 16
): number {
  const distanceIntoTopEdge = top + edgeSize - pointerY;
  if (distanceIntoTopEdge > 0) {
    return -Math.max(1, Math.round(maxSpeed * Math.min(1, distanceIntoTopEdge / edgeSize)));
  }
  const distanceIntoBottomEdge = pointerY - (bottom - edgeSize);
  if (distanceIntoBottomEdge > 0) {
    return Math.max(1, Math.round(maxSpeed * Math.min(1, distanceIntoBottomEdge / edgeSize)));
  }
  return 0;
}
