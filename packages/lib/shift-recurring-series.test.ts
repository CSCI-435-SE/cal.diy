import { describe, expect, it } from "vitest";
import { shiftSeriesOccurrences } from "./shift-recurring-series";

const NEW_YORK = "America/New_York";

const occurrencesAt = (...startTimes: string[]) =>
  startTimes.map((startTime, index) => ({ uid: `occurrence-${index}`, startTime }));

const shiftedStarts = (input: Parameters<typeof shiftSeriesOccurrences>[0]) =>
  shiftSeriesOccurrences(input).map((occurrence) => occurrence.start);

describe("shiftSeriesOccurrences", () => {
  it("moves a weekly Tuesday 2pm series to Thursday 3pm", () => {
    const result = shiftSeriesOccurrences({
      // Tue Sep 1, 8 and 15, 2026 at 2pm EDT
      occurrences: occurrencesAt("2026-09-01T18:00:00Z", "2026-09-08T18:00:00Z", "2026-09-15T18:00:00Z"),
      oldAnchorStart: "2026-09-01T18:00:00Z",
      newAnchorStart: "2026-09-03T19:00:00Z",
      timeZone: NEW_YORK,
      durationMinutes: 30,
    });

    expect(result).toEqual([
      { rescheduleUid: "occurrence-0", start: "2026-09-03T19:00:00.000Z", end: "2026-09-03T19:30:00.000Z" },
      { rescheduleUid: "occurrence-1", start: "2026-09-10T19:00:00.000Z", end: "2026-09-10T19:30:00.000Z" },
      { rescheduleUid: "occurrence-2", start: "2026-09-17T19:00:00.000Z", end: "2026-09-17T19:30:00.000Z" },
    ]);
  });

  it("keeps 2pm local when a shift crosses the end of DST", () => {
    // Wed Oct 21 and 28 are 2pm EDT, Wed Nov 4 is 2pm EST. Moving to Mondays crosses Nov 1 for Oct 28.
    expect(
      shiftedStarts({
        occurrences: occurrencesAt("2026-10-21T18:00:00Z", "2026-10-28T18:00:00Z", "2026-11-04T19:00:00Z"),
        oldAnchorStart: "2026-10-21T18:00:00Z",
        newAnchorStart: "2026-10-26T18:00:00Z",
        timeZone: NEW_YORK,
        durationMinutes: 30,
      })
    ).toEqual(["2026-10-26T18:00:00.000Z", "2026-11-02T19:00:00.000Z", "2026-11-09T19:00:00.000Z"]);
  });

  it("keeps 2pm local when a shift crosses the start of DST", () => {
    // Fri Mar 6, 2026 is 2pm EST; moving to Monday Mar 9 crosses Mar 8 into EDT.
    expect(
      shiftedStarts({
        occurrences: occurrencesAt("2026-03-06T19:00:00Z", "2026-03-13T18:00:00Z"),
        oldAnchorStart: "2026-03-06T19:00:00Z",
        newAnchorStart: "2026-03-09T18:00:00Z",
        timeZone: NEW_YORK,
        durationMinutes: 30,
      })
    ).toEqual(["2026-03-09T18:00:00.000Z", "2026-03-16T18:00:00.000Z"]);
  });

  it("keeps the gap left by a cancelled occurrence", () => {
    // Sep 8 was cancelled, so the series has Sep 1 and Sep 15 only.
    expect(
      shiftedStarts({
        occurrences: occurrencesAt("2026-09-01T18:00:00Z", "2026-09-15T18:00:00Z"),
        oldAnchorStart: "2026-09-01T18:00:00Z",
        newAnchorStart: "2026-09-03T19:00:00Z",
        timeZone: NEW_YORK,
        durationMinutes: 30,
      })
    ).toEqual(["2026-09-03T19:00:00.000Z", "2026-09-17T19:00:00.000Z"]);
  });

  it("moves a series to an earlier day", () => {
    expect(
      shiftedStarts({
        occurrences: occurrencesAt("2026-09-08T18:00:00Z", "2026-09-15T18:00:00Z"),
        oldAnchorStart: "2026-09-08T18:00:00Z",
        newAnchorStart: "2026-09-07T18:00:00Z",
        timeZone: NEW_YORK,
        durationMinutes: 30,
      })
    ).toEqual(["2026-09-07T18:00:00.000Z", "2026-09-14T18:00:00.000Z"]);
  });

  it("uses the attendee's local dates rather than UTC dates", () => {
    // Tue Sep 1 at 9pm EDT is already Sep 2 in UTC. Moving to Wed 8am local is one day later, not zero.
    expect(
      shiftedStarts({
        occurrences: occurrencesAt("2026-09-02T01:00:00Z", "2026-09-09T01:00:00Z"),
        oldAnchorStart: "2026-09-02T01:00:00Z",
        newAnchorStart: "2026-09-02T12:00:00Z",
        timeZone: NEW_YORK,
        durationMinutes: 30,
      })
    ).toEqual(["2026-09-02T12:00:00.000Z", "2026-09-09T12:00:00.000Z"]);
  });

  it("keeps a fixed time for an attendee in a timezone without DST", () => {
    // Tue 10am in Tokyo (01:00 UTC) across the US DST change; Tokyo times must not move.
    expect(
      shiftedStarts({
        occurrences: occurrencesAt("2026-10-27T01:00:00Z", "2026-11-03T01:00:00Z"),
        oldAnchorStart: "2026-10-27T01:00:00Z",
        newAnchorStart: "2026-10-29T02:00:00Z",
        timeZone: "Asia/Tokyo",
        durationMinutes: 30,
      })
    ).toEqual(["2026-10-29T02:00:00.000Z", "2026-11-05T02:00:00.000Z"]);
  });
});
