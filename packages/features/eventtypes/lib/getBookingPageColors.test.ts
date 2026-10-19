import { describe, expect, it } from "vitest";
import { getBookingPageColors, withBookingPageColors } from "./getBookingPageColors";

const accentColors = { lightEventTypeColor: "#292929", darkEventTypeColor: "#fafafa" };

describe("getBookingPageColors", () => {
  it("returns null when the editor toggle is off", () => {
    expect(getBookingPageColors(null)).toBeNull();
  });

  it("returns null when the stored value is malformed", () => {
    expect(getBookingPageColors({ lightEventTypeColor: 3 })).toBeNull();
    expect(getBookingPageColors({ ...accentColors, backgroundColor: "red" })).toBeNull();
    expect(getBookingPageColors("not an object")).toBeNull();
  });

  it("returns null when only the accent colors are stored", () => {
    expect(getBookingPageColors(accentColors)).toBeNull();
  });

  it("returns only the background color when the text color is missing", () => {
    expect(getBookingPageColors({ ...accentColors, backgroundColor: "#101010" })).toEqual({
      backgroundColor: "#101010",
    });
  });

  it("returns only the text color when the background color is missing", () => {
    expect(getBookingPageColors({ ...accentColors, textColor: "#ffffff" })).toEqual({
      textColor: "#ffffff",
    });
  });

  it("returns both colors and no accent colors", () => {
    expect(
      getBookingPageColors({ ...accentColors, backgroundColor: "#101010", textColor: "#ffffff" })
    ).toEqual({ backgroundColor: "#101010", textColor: "#ffffff" });
  });
});

describe("withBookingPageColors", () => {
  it("replaces the stored colors with the booking page colors", () => {
    const result = withBookingPageColors({
      id: 1,
      eventTypeColor: { ...accentColors, backgroundColor: "#101010", textColor: "#ffffff" },
    });

    expect(result).toEqual({
      id: 1,
      bookingPageColors: { backgroundColor: "#101010", textColor: "#ffffff" },
    });
    expect(result).not.toHaveProperty("eventTypeColor");
  });

  it("sets null booking page colors when the toggle is off", () => {
    expect(withBookingPageColors({ id: 1, eventTypeColor: null })).toEqual({
      id: 1,
      bookingPageColors: null,
    });
  });
});
