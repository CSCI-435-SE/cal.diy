import type { TimeRange } from "@calcom/types/schedule";

const MINUTES_PER_DAY = 24 * 60;
const FALLBACK_INTERVAL_MINUTES = 15;
// The dropdowns offer 23:59 as the latest end time, meaning "end of day"
const END_OF_DAY_MINUTES = MINUTES_PER_DAY - 1;

function toMinutesOfDay(date: Date): number {
  // Schedule times are stored as dates where only the UTC hour/minute are meaningful
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

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
      const startMinutes = toMinutesOfDay(new Date(range.start));
      const rawEndMinutes = toMinutesOfDay(new Date(range.end));
      const endMinutes = rawEndMinutes === END_OF_DAY_MINUTES ? MINUTES_PER_DAY : rawEndMinutes;
      const firstSlot = Math.floor(startMinutes / interval);
      const lastSlotExclusive = Math.min(Math.ceil(endMinutes / interval), slotsPerDay);
      for (let slot = firstSlot; slot < lastSlotExclusive; slot++) {
        slots[slot] = true;
      }
    }
    grid.push(slots);
  }

  return grid;
}
