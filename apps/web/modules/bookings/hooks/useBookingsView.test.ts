import { describe, expect, it } from "vitest";
import { isBookingView, resolveInitialBookingsView } from "./useBookingsView";

const base = { urlView: null, storedView: null, bookingsV3Enabled: true, isMobile: false };

describe("resolveInitialBookingsView", () => {
  it.each([
    ["fresh desktop user defaults to month", {}, "month"],
    ["explicit URL list wins over stored view", { urlView: "list", storedView: "month" }, null],
    ["explicit URL week wins over stored view", { urlView: "calendar", storedView: "list" }, null],
    ["explicit URL month is kept", { urlView: "month" }, null],
    ["stored list is restored", { storedView: "list" }, "list"],
    ["stored week is restored", { storedView: "calendar" }, "calendar"],
    ["invalid URL falls back to stored view", { urlView: "agenda", storedView: "calendar" }, "calendar"],
    ["mobile users keep list", { isMobile: true }, null],
    ["feature-disabled users keep list", { bookingsV3Enabled: false }, null],
  ] as const)("%s", (_name, overrides, expected) => {
    expect(resolveInitialBookingsView({ ...base, ...overrides })).toBe(expected);
  });

  it("accepts only known views", () => {
    expect(["list", "calendar", "month", "week", null].map(isBookingView)).toEqual([
      true,
      true,
      true,
      false,
      false,
    ]);
  });
});
