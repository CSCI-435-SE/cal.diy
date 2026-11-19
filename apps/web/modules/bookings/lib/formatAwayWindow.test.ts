import { describe, expect, it } from "vitest";
import { dayPrintsNoTimes, formatAwayWindow } from "./formatAwayWindow";

const TWELVE_HOUR = "h:mma";
const TWENTY_FOUR_HOUR = "HH:mm";

// Every expected value below is worked out by hand from the UTC offset of the zone on that date.
describe("formatAwayWindow", () => {
  describe("a window that starts and ends on one date", () => {
    // A London host is away 14:00 to 15:00 on 2026-10-08. London is on BST (UTC+1), so that is 13:00Z to 14:00Z.
    const start = "2026-10-08T13:00:00.000Z";
    const end = "2026-10-08T14:00:00.000Z";

    it("shows the hours in the attendee's zone, not the host's", () => {
      // New York is on EDT (UTC-4).
      expect(formatAwayWindow(start, end, "America/New_York", TWELVE_HOUR, "en")).toEqual({
        start: "9:00am",
        end: "10:00am",
      });
    });

    it("shows the host's own hours when the attendee is in the host's zone", () => {
      expect(formatAwayWindow(start, end, "Europe/London", TWENTY_FOUR_HOUR, "en")).toEqual({
        start: "14:00",
        end: "15:00",
      });
    });

    it("follows the 12-hour or 24-hour format for the same zone", () => {
      expect(formatAwayWindow(start, end, "America/New_York", TWENTY_FOUR_HOUR, "en")).toEqual({
        start: "09:00",
        end: "10:00",
      });
      expect(formatAwayWindow(start, end, "Europe/London", TWELVE_HOUR, "en")).toEqual({
        start: "2:00pm",
        end: "3:00pm",
      });
    });

    it("shows the minutes of the window, not a rounded slot time", () => {
      expect(
        formatAwayWindow("2026-10-08T14:10:00.000Z", "2026-10-08T14:50:00.000Z", "UTC", TWENTY_FOUR_HOUR, "en")
      ).toEqual({ start: "14:10", end: "14:50" });
    });

    it("uses a zone with a half-hour offset", () => {
      // Kolkata is UTC+5:30 all year.
      expect(formatAwayWindow(start, end, "Asia/Kolkata", TWENTY_FOUR_HOUR, "en")).toEqual({
        start: "18:30",
        end: "19:30",
      });
    });
  });

  describe("daylight saving time", () => {
    it("uses the offset on each side of the spring change in America/New_York", () => {
      // On 2026-03-08 New York moves from EST (UTC-5) to EDT (UTC-4) at 07:00Z. 06:30Z is 1:30am EST and
      // 07:30Z is 3:30am EDT.
      expect(
        formatAwayWindow(
          "2026-03-08T06:30:00.000Z",
          "2026-03-08T07:30:00.000Z",
          "America/New_York",
          TWELVE_HOUR,
          "en"
        )
      ).toEqual({ start: "1:30am", end: "3:30am" });
    });

    it("uses the offset on each side of the autumn change in America/New_York", () => {
      // On 2026-11-01 New York moves from EDT (UTC-4) to EST (UTC-5) at 06:00Z. 05:30Z is 1:30am EDT and
      // 06:30Z is 1:30am EST.
      expect(
        formatAwayWindow(
          "2026-11-01T05:30:00.000Z",
          "2026-11-01T06:30:00.000Z",
          "America/New_York",
          TWELVE_HOUR,
          "en"
        )
      ).toEqual({ start: "1:30am", end: "1:30am" });
    });

    it("handles the weeks when New York has changed and London has not", () => {
      // On 2026-03-10 London is still on GMT (UTC+0) and New York is already on EDT (UTC-4). A London
      // 14:00 to 15:00 window is 14:00Z to 15:00Z, which is 10:00am to 11:00am in New York.
      expect(
        formatAwayWindow(
          "2026-03-10T14:00:00.000Z",
          "2026-03-10T15:00:00.000Z",
          "America/New_York",
          TWELVE_HOUR,
          "en"
        )
      ).toEqual({ start: "10:00am", end: "11:00am" });
    });
  });

  describe("a window that starts and ends on different dates in the attendee's zone", () => {
    it("adds the date to both times for an entry that spans several days", () => {
      expect(
        formatAwayWindow("2026-10-08T14:00:00.000Z", "2026-10-10T10:00:00.000Z", "UTC", TWENTY_FOUR_HOUR, "en")
      ).toEqual({ start: "Oct 8, 14:00", end: "Oct 10, 10:00" });
    });

    // 13:00Z to 15:30Z on 2026-10-08. Tokyo is UTC+9, so it is 22:00 on the 8th to 00:30 on the 9th there.
    const crossesTokyoMidnight = ["2026-10-08T13:00:00.000Z", "2026-10-08T15:30:00.000Z"] as const;

    it("adds the date when the window crosses midnight only for the attendee", () => {
      expect(formatAwayWindow(...crossesTokyoMidnight, "Asia/Tokyo", TWENTY_FOUR_HOUR, "en")).toEqual({
        start: "Oct 8, 22:00",
        end: "Oct 9, 00:30",
      });
      expect(formatAwayWindow(...crossesTokyoMidnight, "UTC", TWENTY_FOUR_HOUR, "en")).toEqual({
        start: "13:00",
        end: "15:30",
      });
    });

    it("adds no date when the window crosses midnight for the host but not for the attendee", () => {
      // 22:00Z on the 8th to 02:00Z on the 9th is 07:00 to 11:00 on the 9th in Tokyo.
      const start = "2026-10-08T22:00:00.000Z";
      const end = "2026-10-09T02:00:00.000Z";
      expect(formatAwayWindow(start, end, "Asia/Tokyo", TWENTY_FOUR_HOUR, "en")).toEqual({
        start: "07:00",
        end: "11:00",
      });
      expect(formatAwayWindow(start, end, "UTC", TWENTY_FOUR_HOUR, "en")).toEqual({
        start: "Oct 8, 22:00",
        end: "Oct 9, 02:00",
      });
    });

    it("takes the date from the attendee's zone, not from UTC", () => {
      // 06:00Z to 08:00Z on 2026-10-09 is one UTC date. Los Angeles is on PDT (UTC-7), so it is 23:00 on
      // the 8th to 01:00 on the 9th there.
      expect(
        formatAwayWindow(
          "2026-10-09T06:00:00.000Z",
          "2026-10-09T08:00:00.000Z",
          "America/Los_Angeles",
          TWENTY_FOUR_HOUR,
          "en"
        )
      ).toEqual({ start: "Oct 8, 23:00", end: "Oct 9, 01:00" });
    });

    it("keeps the 12-hour format beside the date", () => {
      expect(formatAwayWindow(...crossesTokyoMidnight, "Asia/Tokyo", TWELVE_HOUR, "en")).toEqual({
        start: "Oct 8, 10:00pm",
        end: "Oct 9, 12:30am",
      });
    });

    it("writes the date the way the booker's locale does", () => {
      expect(formatAwayWindow(...crossesTokyoMidnight, "Asia/Tokyo", TWENTY_FOUR_HOUR, "en-GB")).toEqual({
        start: "8 Oct, 22:00",
        end: "9 Oct, 00:30",
      });
      expect(formatAwayWindow(...crossesTokyoMidnight, "Asia/Tokyo", TWENTY_FOUR_HOUR, "de")).toEqual({
        start: "8. Okt., 22:00",
        end: "9. Okt., 00:30",
      });
    });

    it("adds the date when the window ends exactly at the attendee's midnight", () => {
      // Midnight is the first instant of the next date, so the two dates differ.
      expect(
        formatAwayWindow("2026-10-08T20:00:00.000Z", "2026-10-09T00:00:00.000Z", "UTC", TWENTY_FOUR_HOUR, "en")
      ).toEqual({ start: "Oct 8, 20:00", end: "Oct 9, 00:00" });
    });

    it("adds the date across a month and a year", () => {
      expect(
        formatAwayWindow("2026-12-31T23:00:00.000Z", "2027-01-01T01:00:00.000Z", "UTC", TWENTY_FOUR_HOUR, "en")
      ).toEqual({ start: "Dec 31, 23:00", end: "Jan 1, 01:00" });
    });
  });
});

describe("dayPrintsNoTimes", () => {
  const window = { outOfOfficeStart: "2026-10-08T14:00:00.000Z", outOfOfficeEnd: "2026-10-08T15:00:00.000Z" };

  it("is true when every slot is away for a whole-day entry", () => {
    expect(dayPrintsNoTimes([{ away: true }, { away: true }])).toBe(true);
  });

  it("is false when a slot can be booked", () => {
    expect(dayPrintsNoTimes([{ away: true }, {}])).toBe(false);
    expect(dayPrintsNoTimes([{ away: false }])).toBe(false);
  });

  it("is false when every slot is away but a panel has hours", () => {
    expect(dayPrintsNoTimes([{ away: true, ...window }])).toBe(false);
    expect(dayPrintsNoTimes([{ away: true }, { away: true, ...window }])).toBe(false);
  });

  it("is false for a day with no slots", () => {
    expect(dayPrintsNoTimes([])).toBe(false);
  });
});
