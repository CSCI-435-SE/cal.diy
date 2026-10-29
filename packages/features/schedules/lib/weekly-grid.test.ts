import type { TimeRange } from "@calcom/types/schedule";
import { describe, expect, it } from "vitest";
import {
  applyDragToSlots,
  applyDragToTimeRanges,
  getAutoScrollSpeed,
  getSlotsPerDay,
  resolveSlotInterval,
  scheduleToSlotGrid,
} from "./weekly-grid";

const time = (hours: number, minutes = 0) => new Date(Date.UTC(1970, 0, 1, hours, minutes));
const range = (start: Date, end: Date): TimeRange => ({ start, end });

const emptyWeek = (): TimeRange[][] => [[], [], [], [], [], [], []];

const selectedSlots = (slots: boolean[]) =>
  slots.reduce<number[]>((indices, isSelected, index) => {
    if (isSelected) indices.push(index);
    return indices;
  }, []);

const slotRange = (from: number, toInclusive: number) =>
  Array.from({ length: toInclusive - from + 1 }, (_, i) => from + i);

describe("resolveSlotInterval", () => {
  it.each([5, 10, 15, 20, 30, 60])("keeps %i because it divides an hour evenly", (interval) => {
    expect(resolveSlotInterval(interval)).toBe(interval);
  });

  it.each([0, -15, 7, 45, 120, Number.NaN, 12.5])("falls back to 15 for %s", (interval) => {
    expect(resolveSlotInterval(interval)).toBe(15);
  });
});

describe("getSlotsPerDay", () => {
  it.each([
    [15, 96],
    [30, 48],
    [60, 24],
    [7, 96],
  ])("returns the slot count for a %i minute interval", (interval, expected) => {
    expect(getSlotsPerDay(interval)).toBe(expected);
  });
});

describe("scheduleToSlotGrid", () => {
  it("returns 7 days of unselected slots for an empty schedule", () => {
    const grid = scheduleToSlotGrid(emptyWeek(), 15);

    expect(grid).toHaveLength(7);
    for (const day of grid) {
      expect(day).toHaveLength(96);
      expect(day.every((slot) => !slot)).toBe(true);
    }
  });

  it("treats missing days as unavailable", () => {
    const grid = scheduleToSlotGrid([], 15);

    expect(grid).toHaveLength(7);
    expect(grid.flat().some(Boolean)).toBe(false);
  });

  it("selects 9:00–17:00 as slots 36 through 67", () => {
    const schedule = emptyWeek();
    schedule[1] = [range(time(9), time(17))];

    const grid = scheduleToSlotGrid(schedule, 15);

    expect(selectedSlots(grid[1])).toEqual(slotRange(36, 67));
  });

  it("handles ranges that start and end on quarter hours", () => {
    const schedule = emptyWeek();
    schedule[2] = [range(time(9, 30), time(17, 15))];

    const grid = scheduleToSlotGrid(schedule, 15);

    expect(selectedSlots(grid[2])).toEqual(slotRange(38, 68));
  });

  it("selects multiple non-contiguous ranges on the same day", () => {
    const schedule = emptyWeek();
    schedule[3] = [range(time(9), time(12)), range(time(13), time(17))];

    const grid = scheduleToSlotGrid(schedule, 15);

    expect(selectedSlots(grid[3])).toEqual([...slotRange(36, 47), ...slotRange(52, 67)]);
  });

  it("fills the final slot when a range ends at 23:59", () => {
    const schedule = emptyWeek();
    schedule[0] = [range(time(0), time(23, 59))];

    const grid = scheduleToSlotGrid(schedule, 15);

    expect(grid[0].every(Boolean)).toBe(true);
  });

  it("selects any slot partially covered by a range", () => {
    const schedule = emptyWeek();
    schedule[4] = [range(time(9, 10), time(9, 20))];

    const grid = scheduleToSlotGrid(schedule, 15);

    expect(selectedSlots(grid[4])).toEqual([36, 37]);
  });

  it("uses the given interval to size and fill slots", () => {
    const schedule = emptyWeek();
    schedule[5] = [range(time(9), time(17))];

    const grid = scheduleToSlotGrid(schedule, 30);

    expect(grid[5]).toHaveLength(48);
    expect(selectedSlots(grid[5])).toEqual(slotRange(18, 33));
  });

  it("falls back to 15 minute slots for an invalid interval", () => {
    const grid = scheduleToSlotGrid(emptyWeek(), 45);

    expect(grid[0]).toHaveLength(96);
  });

  it("places ranges on the matching weekday index", () => {
    const schedule = emptyWeek();
    schedule[6] = [range(time(10), time(11))];

    const grid = scheduleToSlotGrid(schedule, 15);

    grid.forEach((day, index) => {
      expect(day.some(Boolean)).toBe(index === 6);
    });
  });
});

describe("applyDragToSlots", () => {
  const empty = () => new Array<boolean>(96).fill(false);

  it("selects every slot from the anchor down to the current slot", () => {
    expect(selectedSlots(applyDragToSlots(empty(), 36, 39, "select"))).toEqual(slotRange(36, 39));
  });

  it("selects the same span when dragging upwards", () => {
    expect(selectedSlots(applyDragToSlots(empty(), 39, 36, "select"))).toEqual(slotRange(36, 39));
  });

  it("toggles a single slot when the pointer does not move", () => {
    expect(selectedSlots(applyDragToSlots(empty(), 40, 40, "select"))).toEqual([40]);
  });

  it("clears slots in deselect mode", () => {
    const slots = applyDragToSlots(empty(), 36, 51, "select");

    expect(selectedSlots(applyDragToSlots(slots, 44, 47, "deselect"))).toEqual([
      ...slotRange(36, 43),
      ...slotRange(48, 51),
    ]);
  });

  it("keeps already selected slots selected when selecting over them", () => {
    const slots = applyDragToSlots(empty(), 36, 39, "select");

    expect(selectedSlots(applyDragToSlots(slots, 38, 42, "select"))).toEqual(slotRange(36, 42));
  });

  it("does not mutate the input", () => {
    const slots = empty();
    applyDragToSlots(slots, 0, 10, "select");

    expect(slots.some(Boolean)).toBe(false);
  });
});

describe("applyDragToTimeRanges", () => {
  const now = new Date(Date.UTC(2026, 9, 8, 15, 30));
  const today = (hours: number, minutes = 0) => new Date(Date.UTC(2026, 9, 8, hours, minutes));
  const endOfToday = new Date(Date.UTC(2026, 9, 8, 23, 59, 59, 999));
  const minutes = (hours: number, mins = 0) => hours * 60 + mins;
  const asText = (ranges: TimeRange[]) =>
    ranges.map(({ start, end }) => `${start.toISOString().slice(11, 16)}-${end.toISOString().slice(11, 16)}`);

  it("adds a range to an empty day using today's UTC date", () => {
    const result = applyDragToTimeRanges(
      [],
      { startMinute: minutes(9), endMinute: minutes(13), mode: "select" },
      now
    );

    expect(result).toEqual([{ start: today(9), end: today(13) }]);
  });

  it("merges a selection with a range it touches", () => {
    const result = applyDragToTimeRanges(
      [range(today(6), today(7))],
      { startMinute: minutes(7), endMinute: minutes(8), mode: "select" },
      now
    );

    expect(asText(result)).toEqual(["06:00-08:00"]);
  });

  it("bridges two ranges into one", () => {
    const result = applyDragToTimeRanges(
      [range(today(6), today(7)), range(today(8), today(9))],
      { startMinute: minutes(7), endMinute: minutes(8), mode: "select" },
      now
    );

    expect(asText(result)).toEqual(["06:00-09:00"]);
  });

  it("leaves a range unchanged when selecting inside it", () => {
    const existing = range(today(9), today(17));
    const result = applyDragToTimeRanges(
      [existing],
      { startMinute: minutes(10), endMinute: minutes(11), mode: "select" },
      now
    );

    expect(result).toEqual([existing]);
  });

  it("removes a range that is fully deselected", () => {
    const result = applyDragToTimeRanges(
      [range(today(9), today(10))],
      { startMinute: minutes(9), endMinute: minutes(10), mode: "deselect" },
      now
    );

    expect(result).toEqual([]);
  });

  it("shrinks a range when deselecting one of its edges", () => {
    const result = applyDragToTimeRanges(
      [range(today(9), today(13))],
      { startMinute: minutes(12), endMinute: minutes(14), mode: "deselect" },
      now
    );

    expect(asText(result)).toEqual(["09:00-12:00"]);
  });

  it("splits a range when deselecting its middle", () => {
    const result = applyDragToTimeRanges(
      [range(today(9), today(13))],
      { startMinute: minutes(11), endMinute: minutes(12), mode: "deselect" },
      now
    );

    expect(asText(result)).toEqual(["09:00-11:00", "12:00-13:00"]);
  });

  it("keeps ranges outside the dragged span exactly as they were", () => {
    const custom = range(today(9, 10), today(10, 5));
    const afternoon = range(today(14), today(15));
    const result = applyDragToTimeRanges(
      [custom, afternoon],
      { startMinute: minutes(12), endMinute: minutes(13), mode: "select" },
      now
    );

    expect(result[0]).toBe(custom);
    expect(result[2]).toBe(afternoon);
    expect(asText(result)).toEqual(["09:10-10:05", "12:00-13:00", "14:00-15:00"]);
  });

  it("keeps a custom start time when extending that range", () => {
    const result = applyDragToTimeRanges(
      [range(today(9, 10), today(10))],
      { startMinute: minutes(10), endMinute: minutes(11), mode: "select" },
      now
    );

    expect(asText(result)).toEqual(["09:10-11:00"]);
  });

  it("ends a selection reaching the last slot at 23:59:59.999", () => {
    const result = applyDragToTimeRanges(
      [],
      { startMinute: minutes(22), endMinute: 1440, mode: "select" },
      now
    );

    expect(result).toEqual([{ start: today(22), end: endOfToday }]);
  });

  it("treats an existing end-of-day range as reaching midnight when deselecting", () => {
    const result = applyDragToTimeRanges(
      [range(today(20), endOfToday)],
      { startMinute: minutes(21), endMinute: minutes(22), mode: "deselect" },
      now
    );

    expect(result).toEqual([
      { start: today(20), end: today(21) },
      { start: today(22), end: endOfToday },
    ]);
  });

  it("returns ranges sorted by start time", () => {
    const result = applyDragToTimeRanges(
      [range(today(14), today(15))],
      { startMinute: minutes(8), endMinute: minutes(9), mode: "select" },
      now
    );

    expect(asText(result)).toEqual(["08:00-09:00", "14:00-15:00"]);
  });

  it("produces exactly the slots shown in the drag preview", () => {
    const schedule = emptyWeek();
    schedule[2] = [range(today(9), today(13)), range(today(15), today(16))];
    const before = scheduleToSlotGrid(schedule, 15)[2];

    const preview = applyDragToSlots(before, 44, 47, "deselect");
    schedule[2] = applyDragToTimeRanges(
      schedule[2],
      { startMinute: 44 * 15, endMinute: 48 * 15, mode: "deselect" },
      now
    );

    expect(scheduleToSlotGrid(schedule, 15)[2]).toEqual(preview);
  });
});

describe("getAutoScrollSpeed", () => {
  const top = 100;
  const bottom = 700;

  it("does not scroll away from the edges", () => {
    expect(getAutoScrollSpeed(400, top, bottom)).toBe(0);
    expect(getAutoScrollSpeed(top + 40, top, bottom)).toBe(0);
    expect(getAutoScrollSpeed(bottom - 40, top, bottom)).toBe(0);
  });

  it("scrolls up near the top edge and down near the bottom edge", () => {
    expect(getAutoScrollSpeed(top + 10, top, bottom)).toBeLessThan(0);
    expect(getAutoScrollSpeed(bottom - 10, top, bottom)).toBeGreaterThan(0);
  });

  it("scrolls faster closer to the edge", () => {
    expect(getAutoScrollSpeed(bottom - 5, top, bottom)).toBeGreaterThan(
      getAutoScrollSpeed(bottom - 30, top, bottom)
    );
  });

  it("caps the speed when the pointer is past the edge", () => {
    expect(getAutoScrollSpeed(bottom + 200, top, bottom)).toBe(16);
    expect(getAutoScrollSpeed(top - 200, top, bottom)).toBe(-16);
  });
});
