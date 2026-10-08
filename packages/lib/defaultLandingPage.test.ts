import { describe, expect, it } from "vitest";
import { getDefaultLandingPage, getDefaultLandingPagePath } from "./defaultLandingPage";

describe("getDefaultLandingPagePath", () => {
  it("returns /event-types when the user chose Event Types", () => {
    expect(getDefaultLandingPagePath({ defaultLandingPage: "event-types" })).toBe("/event-types");
  });

  it("returns /bookings/upcoming when the user chose Bookings", () => {
    expect(getDefaultLandingPagePath({ defaultLandingPage: "bookings" })).toBe("/bookings/upcoming");
  });

  it("returns /availability when the user chose Availability", () => {
    expect(getDefaultLandingPagePath({ defaultLandingPage: "availability" })).toBe("/availability");
  });

  describe("falls back to /event-types", () => {
    it("when metadata is null", () => {
      expect(getDefaultLandingPagePath(null)).toBe("/event-types");
    });

    it("when metadata is undefined", () => {
      expect(getDefaultLandingPagePath(undefined)).toBe("/event-types");
    });

    it("when metadata has no saved preference", () => {
      expect(getDefaultLandingPagePath({ sessionTimeout: 30 })).toBe("/event-types");
    });

    it("when the saved preference is not a supported page", () => {
      expect(getDefaultLandingPagePath({ defaultLandingPage: "insights" })).toBe("/event-types");
    });

    it("when metadata is not an object", () => {
      expect(getDefaultLandingPagePath("bookings")).toBe("/event-types");
    });
  });
});

describe("getDefaultLandingPage", () => {
  it("keeps other metadata keys from affecting the result", () => {
    expect(
      getDefaultLandingPage({ sessionTimeout: 30, isPremium: true, defaultLandingPage: "availability" })
    ).toBe("availability");
  });

  it("returns event-types when no preference is saved", () => {
    expect(getDefaultLandingPage({})).toBe("event-types");
  });
});
