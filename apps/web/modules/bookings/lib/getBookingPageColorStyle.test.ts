import { describe, expect, it } from "vitest";
import { getBookingPageColorStyle } from "./getBookingPageColorStyle";

describe("getBookingPageColorStyle", () => {
  it("returns an empty style when the event has no booking page colors", () => {
    expect(getBookingPageColorStyle(null)).toEqual({});
    expect(getBookingPageColorStyle(undefined)).toEqual({});
  });

  it("sets only the background variables when only the background color is set", () => {
    expect(getBookingPageColorStyle({ backgroundColor: "#101010" })).toEqual({
      "--cal-bg": "#101010",
      "--cal-bg-muted": "#101010",
    });
  });

  it("sets only the text variables when only the text color is set", () => {
    expect(getBookingPageColorStyle({ textColor: "#ffffff" })).toEqual({
      "--cal-text": "#ffffff",
      "--cal-text-emphasis": "#ffffff",
      "--cal-text-subtle": "color-mix(in srgb, #ffffff 70%, transparent)",
      "--cal-text-muted": "color-mix(in srgb, #ffffff 70%, transparent)",
    });
  });

  it("sets both variable groups when both colors are set", () => {
    expect(getBookingPageColorStyle({ backgroundColor: "#101010", textColor: "#ffffff" })).toEqual({
      "--cal-bg": "#101010",
      "--cal-bg-muted": "#101010",
      "--cal-text": "#ffffff",
      "--cal-text-emphasis": "#ffffff",
      "--cal-text-subtle": "color-mix(in srgb, #ffffff 70%, transparent)",
      "--cal-text-muted": "color-mix(in srgb, #ffffff 70%, transparent)",
    });
  });
});
