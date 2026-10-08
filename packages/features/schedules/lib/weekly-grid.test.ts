import type { TimeRange } from "@calcom/types/schedule";
import { describe, expect, it } from "vitest";
import { getSlotsPerDay, resolveSlotInterval, scheduleToSlotGrid } from "./weekly-grid";

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
