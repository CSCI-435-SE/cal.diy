import { describe, expect, it, vi } from "vitest";
import {
  getEarliestUpcomingStartTime,
  getMinimumCancellationNoticeErrorMessage,
  getMinimumCancellationNoticeViolation,
  isUserBookingHost,
  isWithinMinimumCancellationNotice,
} from "./minimumCancellationNotice";

const NOW = new Date("2026-11-20T12:00:00.000Z");
const ONE_DAY_IN_MINUTES = 24 * 60;
const MS_PER_MINUTE = 60 * 1000;

const minutesFromNow = (minutes: number) => new Date(NOW.getTime() + minutes * MS_PER_MINUTE);
const msFromNow = (ms: number) => new Date(NOW.getTime() + ms);

describe("isWithinMinimumCancellationNotice", () => {
  it("is within the window 1ms before the boundary", () => {
    expect(
      isWithinMinimumCancellationNotice({
        startTime: msFromNow(ONE_DAY_IN_MINUTES * MS_PER_MINUTE - 1),
        minimumCancellationNotice: ONE_DAY_IN_MINUTES,
        now: NOW,
      })
    ).toBe(true);
  });

  it("allows cancelling exactly at the boundary", () => {
    expect(
      isWithinMinimumCancellationNotice({
        startTime: minutesFromNow(ONE_DAY_IN_MINUTES),
        minimumCancellationNotice: ONE_DAY_IN_MINUTES,
        now: NOW,
      })
    ).toBe(false);
  });

  it("allows cancelling 1ms outside the window", () => {
    expect(
      isWithinMinimumCancellationNotice({
        startTime: msFromNow(ONE_DAY_IN_MINUTES * MS_PER_MINUTE + 1),
        minimumCancellationNotice: ONE_DAY_IN_MINUTES,
        now: NOW,
      })
    ).toBe(false);
  });

  it("is within the window for the issue's scenario of cancelling 3 hours before a 24-hour notice", () => {
    expect(
      isWithinMinimumCancellationNotice({
        startTime: minutesFromNow(3 * 60),
        minimumCancellationNotice: ONE_DAY_IN_MINUTES,
        now: NOW,
      })
    ).toBe(true);
  });

  it("stays within the window after the booking has started", () => {
    expect(
      isWithinMinimumCancellationNotice({
        startTime: minutesFromNow(-10),
        minimumCancellationNotice: 60,
        now: NOW,
      })
    ).toBe(true);
  });

  it("accepts an ISO string start time as sent by getServerSideProps", () => {
    expect(
      isWithinMinimumCancellationNotice({
        startTime: minutesFromNow(30).toISOString(),
        minimumCancellationNotice: 60,
        now: NOW,
      })
    ).toBe(true);
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["0", 0],
    ["negative", -5],
  ])("has no effect when the notice is %s", (_label, minimumCancellationNotice) => {
    expect(
      isWithinMinimumCancellationNotice({
        startTime: minutesFromNow(1),
        minimumCancellationNotice,
        now: NOW,
      })
    ).toBe(false);
  });

  it("has no effect when the start time is missing", () => {
    expect(
      isWithinMinimumCancellationNotice({ startTime: null, minimumCancellationNotice: 60, now: NOW })
    ).toBe(false);
  });

  it("defaults now to the current time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    try {
      expect(
        isWithinMinimumCancellationNotice({ startTime: minutesFromNow(59), minimumCancellationNotice: 60 })
      ).toBe(true);
      expect(
        isWithinMinimumCancellationNotice({ startTime: minutesFromNow(60), minimumCancellationNotice: 60 })
      ).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("isUserBookingHost", () => {
  const base = {
    bookingUserId: 1,
    attendeeEmails: ["attendee@example.com", "cohost@example.com"],
    eventTypeHosts: [
      { id: 1, email: "organizer@example.com" },
      { id: 2, email: "cohost@example.com" },
      { id: 3, email: "other-host@example.com" },
    ],
  };

  it("treats the booking organizer as host", () => {
    expect(isUserBookingHost({ ...base, userId: 1 })).toBe(true);
  });

  it("treats an event-type host who is an attendee of the booking as host", () => {
    expect(isUserBookingHost({ ...base, userId: 2 })).toBe(true);
  });

  it("does not treat an event-type host who is not on this booking as host", () => {
    expect(isUserBookingHost({ ...base, userId: 3 })).toBe(false);
  });

  it("does not treat a logged-in attendee who is not an event-type host as host", () => {
    expect(isUserBookingHost({ ...base, userId: 99 })).toBe(false);
  });

  it.each([null, undefined])("does not treat a visitor without a session (%s) as host", (userId) => {
    expect(isUserBookingHost({ ...base, userId })).toBe(false);
  });
});

describe("getEarliestUpcomingStartTime", () => {
  it("returns the earliest start that has not passed, regardless of order", () => {
    const result = getEarliestUpcomingStartTime(
      [minutesFromNow(300), minutesFromNow(-60), minutesFromNow(30).toString(), minutesFromNow(120)],
      NOW
    );
    expect(result).toEqual(minutesFromNow(30));
  });

  it("includes an occurrence starting exactly now", () => {
    expect(getEarliestUpcomingStartTime([minutesFromNow(0), minutesFromNow(10)], NOW)).toEqual(NOW);
  });

  it("returns null when every occurrence has started", () => {
    expect(getEarliestUpcomingStartTime([minutesFromNow(-1), minutesFromNow(-60)], NOW)).toBeNull();
  });
});

describe("getMinimumCancellationNoticeErrorMessage", () => {
  it("states the notice and directs the attendee to the host", () => {
    const message = getMinimumCancellationNoticeErrorMessage(1440);
    expect(message).toContain("minimum cancellation notice of 1440 minutes");
    expect(message).toContain("contact the host");
  });
});

describe("getMinimumCancellationNoticeViolation", () => {
  type StoredBooking = Awaited<
    ReturnType<
      Parameters<
        typeof getMinimumCancellationNoticeViolation
      >[0]["bookingRepository"]["findByUidIncludeAttendeesAndEventTypeHosts"]
    >
  >;

  const buildBooking = (overrides: {
    startTime: Date;
    minimumCancellationNotice: number | null;
    recurringEventId?: string | null;
  }): NonNullable<StoredBooking> => ({
    userId: 1,
    startTime: overrides.startTime,
    recurringEventId: overrides.recurringEventId ?? null,
    attendees: [{ email: "attendee@example.com" }, { email: "cohost@example.com" }],
    eventType: {
      minimumCancellationNotice: overrides.minimumCancellationNotice,
      hosts: [{ user: { id: 2, email: "cohost@example.com" } }],
      users: [{ id: 1, email: "organizer@example.com" }],
    },
  });

  const buildRepository = (
    booking: StoredBooking,
    earliestOccurrence: { startTime: Date } | null = null
  ) => ({
    findByUidIncludeAttendeesAndEventTypeHosts: vi.fn().mockResolvedValue(booking),
    findFirstActiveRecurringBookingFromDate: vi.fn().mockResolvedValue(earliestOccurrence),
  });

  it("rejects an attendee inside the window and reports the notice", async () => {
    const bookingRepository = buildRepository(
      buildBooking({ startTime: minutesFromNow(30), minimumCancellationNotice: 60 })
    );

    await expect(
      getMinimumCancellationNoticeViolation({ bookingRepository, bookingUid: "uid", userId: null, now: NOW })
    ).resolves.toEqual({ minimumCancellationNotice: 60 });
    expect(bookingRepository.findByUidIncludeAttendeesAndEventTypeHosts).toHaveBeenCalledWith({
      bookingUid: "uid",
    });
  });

  it("allows an attendee exactly at the boundary", async () => {
    const bookingRepository = buildRepository(
      buildBooking({ startTime: minutesFromNow(60), minimumCancellationNotice: 60 })
    );

    await expect(
      getMinimumCancellationNoticeViolation({ bookingRepository, bookingUid: "uid", userId: null, now: NOW })
    ).resolves.toBeNull();
  });

  it("allows an attendee outside the window", async () => {
    const bookingRepository = buildRepository(
      buildBooking({ startTime: minutesFromNow(61), minimumCancellationNotice: 60 })
    );

    await expect(
      getMinimumCancellationNoticeViolation({ bookingRepository, bookingUid: "uid", userId: null, now: NOW })
    ).resolves.toBeNull();
  });

  it.each([
    ["the organizer", 1],
    ["a co-host attending the booking", 2],
  ])("exempts %s inside the window", async (_label, userId) => {
    const bookingRepository = buildRepository(
      buildBooking({ startTime: minutesFromNow(5), minimumCancellationNotice: 60 })
    );

    await expect(
      getMinimumCancellationNoticeViolation({ bookingRepository, bookingUid: "uid", userId, now: NOW })
    ).resolves.toBeNull();
  });

  it("rejects a logged-in attendee who is not a host", async () => {
    const bookingRepository = buildRepository(
      buildBooking({ startTime: minutesFromNow(5), minimumCancellationNotice: 60 })
    );

    await expect(
      getMinimumCancellationNoticeViolation({ bookingRepository, bookingUid: "uid", userId: 42, now: NOW })
    ).resolves.toEqual({ minimumCancellationNotice: 60 });
  });

  it.each([null, 0])("keeps current behavior when the notice is %s", async (minimumCancellationNotice) => {
    const bookingRepository = buildRepository(
      buildBooking({ startTime: minutesFromNow(5), minimumCancellationNotice })
    );

    await expect(
      getMinimumCancellationNoticeViolation({ bookingRepository, bookingUid: "uid", userId: null, now: NOW })
    ).resolves.toBeNull();
    expect(bookingRepository.findFirstActiveRecurringBookingFromDate).not.toHaveBeenCalled();
  });

  it("leaves a missing booking for handleCancelBooking to report", async () => {
    const bookingRepository = buildRepository(null);

    await expect(
      getMinimumCancellationNoticeViolation({
        bookingRepository,
        bookingUid: "missing",
        userId: null,
        now: NOW,
      })
    ).resolves.toBeNull();
  });

  it("keeps current behavior for a booking without an event type", async () => {
    const booking = { ...buildBooking({ startTime: minutesFromNow(5), minimumCancellationNotice: 60 }) };
    const bookingRepository = buildRepository({ ...booking, eventType: null });

    await expect(
      getMinimumCancellationNoticeViolation({ bookingRepository, bookingUid: "uid", userId: null, now: NOW })
    ).resolves.toBeNull();
  });

  describe("recurring series", () => {
    it("rejects cancelling all remaining when the earliest upcoming occurrence is inside the window", async () => {
      const bookingRepository = buildRepository(
        buildBooking({
          startTime: minutesFromNow(7 * ONE_DAY_IN_MINUTES),
          minimumCancellationNotice: 60,
          recurringEventId: "series-1",
        }),
        { startTime: minutesFromNow(30) }
      );

      await expect(
        getMinimumCancellationNoticeViolation({
          bookingRepository,
          bookingUid: "uid",
          userId: null,
          allRemainingBookings: true,
          now: NOW,
        })
      ).resolves.toEqual({ minimumCancellationNotice: 60 });
      expect(bookingRepository.findFirstActiveRecurringBookingFromDate).toHaveBeenCalledWith({
        recurringEventId: "series-1",
        fromDate: NOW,
      });
    });

    it("allows cancelling all remaining when the earliest upcoming occurrence is outside the window", async () => {
      const bookingRepository = buildRepository(
        buildBooking({
          startTime: minutesFromNow(30),
          minimumCancellationNotice: 60,
          recurringEventId: "series-1",
        }),
        { startTime: minutesFromNow(120) }
      );

      await expect(
        getMinimumCancellationNoticeViolation({
          bookingRepository,
          bookingUid: "uid",
          userId: null,
          allRemainingBookings: true,
          now: NOW,
        })
      ).resolves.toBeNull();
    });

    it("checks only the selected occurrence when not cancelling all remaining", async () => {
      const bookingRepository = buildRepository(
        buildBooking({
          startTime: minutesFromNow(120),
          minimumCancellationNotice: 60,
          recurringEventId: "series-1",
        }),
        { startTime: minutesFromNow(30) }
      );

      await expect(
        getMinimumCancellationNoticeViolation({
          bookingRepository,
          bookingUid: "uid",
          userId: null,
          now: NOW,
        })
      ).resolves.toBeNull();
      expect(bookingRepository.findFirstActiveRecurringBookingFromDate).not.toHaveBeenCalled();
    });

    it("falls back to the selected occurrence when no upcoming occurrence remains", async () => {
      const bookingRepository = buildRepository(
        buildBooking({
          startTime: minutesFromNow(-10),
          minimumCancellationNotice: 60,
          recurringEventId: "series-1",
        }),
        null
      );

      await expect(
        getMinimumCancellationNoticeViolation({
          bookingRepository,
          bookingUid: "uid",
          userId: null,
          allRemainingBookings: true,
          now: NOW,
        })
      ).resolves.toEqual({ minimumCancellationNotice: 60 });
    });
  });
});
