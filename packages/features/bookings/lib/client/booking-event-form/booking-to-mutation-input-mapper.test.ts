import { describe, expect, it } from "vitest";

import type { BookingOptions } from "./booking-to-mutation-input-mapper";
import { mapSeriesRescheduleToMutationInput } from "./booking-to-mutation-input-mapper";

const booking: BookingOptions = {
  values: { responses: { name: "Booker", email: "booker@example.com" } },
  event: { id: 1, length: 30, slug: "weekly-session", schedulingType: null, recurringEvent: null },
  // The new slot picked for the first occurrence: Thu Sep 3, 2026 at 3pm EDT.
  date: "2026-09-03T19:00:00.000Z",
  duration: null,
  timeZone: "America/New_York",
  language: "en",
  rescheduleUid: "occurrence-1",
  rescheduledBy: "booker@example.com",
  username: "organizer",
};

// Tue Sep 1 and Sep 8, 2026 at 2pm EDT.
const seriesOccurrences = [
  { uid: "occurrence-1", startTime: "2026-09-01T18:00:00.000Z" },
  { uid: "occurrence-2", startTime: "2026-09-08T18:00:00.000Z" },
];

describe("mapSeriesRescheduleToMutationInput", () => {
  const requests = mapSeriesRescheduleToMutationInput({
    booking,
    seriesOccurrences,
    recurringEventId: "existing-series",
  });

  it("builds one request per occurrence, each replacing that occurrence at its shifted time", () => {
    expect(requests.map(({ rescheduleUid, start, end }) => ({ rescheduleUid, start, end }))).toEqual([
      { rescheduleUid: "occurrence-1", start: "2026-09-03T19:00:00.000Z", end: "2026-09-03T19:30:00.000Z" },
      { rescheduleUid: "occurrence-2", start: "2026-09-10T19:00:00.000Z", end: "2026-09-10T19:30:00.000Z" },
    ]);
  });

  it("keeps the existing series id and counts every occurrence being moved", () => {
    for (const request of requests) {
      expect(request).toEqual(
        expect.objectContaining({ recurringEventId: "existing-series", recurringCount: 2 })
      );
    }
  });

  it("copies the shared booking fields onto every request", () => {
    for (const request of requests) {
      expect(request).toEqual(
        expect.objectContaining({
          eventTypeId: 1,
          timeZone: "America/New_York",
          rescheduledBy: "booker@example.com",
          responses: { name: "Booker", email: "booker@example.com" },
        })
      );
    }
  });
});
