import { describe, expect, it } from "vitest";
import { isWithinRunningLateWindow, RUNNING_LATE_WINDOW_MS } from "./runningLate";

const now = new Date("2026-11-12T12:00:00Z");
const MINUTE = 60 * 1000;

function meetingStartingIn(msFromNow: number, durationMs = 30 * MINUTE) {
  const startTime = new Date(now.getTime() + msFromNow);
  return { startTime, endTime: new Date(startTime.getTime() + durationMs), now };
}

describe("isWithinRunningLateWindow", () => {
  it("allows a booking starting in 30 minutes", () => {
    expect(isWithinRunningLateWindow(meetingStartingIn(30 * MINUTE))).toBe(true);
  });

  it("allows a booking starting exactly 2 hours from now", () => {
    expect(isWithinRunningLateWindow(meetingStartingIn(RUNNING_LATE_WINDOW_MS))).toBe(true);
  });

  it("rejects a booking starting just over 2 hours from now", () => {
    expect(isWithinRunningLateWindow(meetingStartingIn(RUNNING_LATE_WINDOW_MS + 1))).toBe(false);
  });

  it("allows a booking that is in progress", () => {
    expect(isWithinRunningLateWindow(meetingStartingIn(-10 * MINUTE))).toBe(true);
  });

  it("rejects a booking at the exact moment it ends", () => {
    expect(isWithinRunningLateWindow(meetingStartingIn(-30 * MINUTE))).toBe(false);
  });

  it("rejects a booking that has already ended", () => {
    expect(isWithinRunningLateWindow(meetingStartingIn(-2 * 60 * MINUTE))).toBe(false);
  });

  it("accepts ISO strings as sent to the bookings list", () => {
    const { startTime, endTime } = meetingStartingIn(15 * MINUTE);
    expect(
      isWithinRunningLateWindow({ startTime: startTime.toISOString(), endTime: endTime.toISOString(), now })
    ).toBe(true);
  });
});
