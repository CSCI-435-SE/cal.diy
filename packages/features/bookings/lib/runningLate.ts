export const RUNNING_LATE_DELAY_OPTIONS = [5, 10, 15, 30] as const;

export type RunningLateDelayMinutes = (typeof RUNNING_LATE_DELAY_OPTIONS)[number];

export const RUNNING_LATE_WINDOW_MS = 2 * 60 * 60 * 1000;

export const RUNNING_LATE_MESSAGE_MAX_LENGTH = 500;

// Shared by the bookings list and the mutation so the button never shows for a booking the server would reject
export function isWithinRunningLateWindow({
  startTime,
  endTime,
  now = new Date(),
}: {
  startTime: Date | string;
  endTime: Date | string;
  now?: Date;
}): boolean {
  const nowMs = now.getTime();
  const startMs = new Date(startTime).getTime();
  const endMs = new Date(endTime).getTime();

  if (nowMs >= endMs) return false;

  return startMs - nowMs <= RUNNING_LATE_WINDOW_MS;
}
