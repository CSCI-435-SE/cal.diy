import type { GetUserAvailabilityInitialData } from "@calcom/features/availability/lib/getUserAvailability";
import { UserAvailabilityService } from "@calcom/features/availability/lib/getUserAvailability";
import { ErrorCode } from "@calcom/lib/errorCodes";
import logger from "@calcom/lib/logger";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ensureAvailableUsers } from "./ensureAvailableUsers";

const mockDependencies: ConstructorParameters<typeof UserAvailabilityService>[0] = {
  oooRepo: {
    findUserOOODays: vi.fn().mockResolvedValue([]),
  },
  bookingRepo: {
    findAcceptedBookingByEventTypeId: vi.fn().mockResolvedValue([]),
  },
  redisClient: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn(),
  },
  eventTypeRepo: {
    findByIdForUserAvailability: vi.fn().mockResolvedValue(null),
    findForSlots: vi.fn().mockResolvedValue(null),
  },
  holidayRepo: {
    findUserSettingsSelect: vi.fn().mockResolvedValue(null),
  },
};

vi.mock("@calcom/features/di/containers/GetUserAvailability", () => ({
  getUserAvailabilityService: () => new UserAvailabilityService(mockDependencies),
}));

vi.mock("@calcom/features/di/containers/BusyTimes", () => ({
  getBusyTimesService: () => ({
    getBusyTimes: vi.fn().mockResolvedValue([]),
    getBusyTimesForLimitChecks: vi.fn().mockResolvedValue([]),
  }),
}));

vi.mock("@calcom/features/busyTimes/lib/getBusyTimesFromLimits", () => ({
  getBusyTimesFromLimits: vi.fn().mockResolvedValue([]),
  getBusyTimesFromTeamLimits: vi.fn().mockResolvedValue([]),
}));

vi.mock("@calcom/app-store/_utils/getCalendar", () => ({
  getCalendar: vi.fn(),
}));

vi.mock("@calcom/lib/holidays", () => ({
  getHolidayService: vi.fn(() => ({
    getHolidayDatesInRange: vi.fn().mockResolvedValue([]),
  })),
}));

const timeZone = "America/New_York";

type OutOfOfficeDay = NonNullable<GetUserAvailabilityInitialData["outOfOfficeDays"]>[number];

// Stored values are the host's wall-clock time in UTC columns, as outOfOfficeCreateOrUpdate writes them.
const outOfOfficeEntry = (start: string, end: string): OutOfOfficeDay => ({
  id: 1,
  start: new Date(start),
  end: new Date(end),
  notes: null,
  showNotePublicly: false,
  user: { id: 1, name: "Host" },
  toUser: null,
  reason: null,
});

// Monday to Friday, 09:00-17:00 in America/New_York, with the out-of-office entries the booking handler
// loads onto the user. Only the fields the availability service and the guard read are filled in.
const hostWith = (outOfOfficeDays: OutOfOfficeDay[]) => ({
  id: 1,
  username: "host",
  name: "Host",
  email: "host@example.com",
  bufferTime: 0,
  timeZone,
  availability: [],
  timeFormat: 24,
  defaultScheduleId: 1,
  isPlatformManaged: false,
  isFixed: false,
  schedules: [
    {
      id: 1,
      availability: [
        {
          days: [1, 2, 3, 4, 5],
          startTime: new Date("1970-01-01T09:00:00Z"),
          endTime: new Date("1970-01-01T17:00:00Z"),
          date: null,
        },
      ],
      timeZone,
    },
  ],
  credentials: [],
  allSelectedCalendars: [],
  userLevelSelectedCalendars: [],
  travelSchedules: [],
  outOfOfficeDays,
  currentBookings: [],
});

type EnsureAvailableUsersEventType = Parameters<typeof ensureAvailableUsers>[0];

const eventTypeWith = (outOfOfficeDays: OutOfOfficeDay[]) =>
  ({
    id: 10,
    length: 60,
    availability: [],
    schedulingType: null,
    beforeEventBuffer: 0,
    afterEventBuffer: 0,
    users: [hostWith(outOfOfficeDays)],
  }) as unknown as EnsureAvailableUsersEventType;

const log = logger.getSubLogger({ prefix: ["ensureAvailableUsers.outOfOffice.test"] });

const bookingBetween = (dateFrom: string, dateTo: string) => ({ dateFrom, dateTo, timeZone: "UTC" });

describe("ensureAvailableUsers with a partial-day out-of-office entry", () => {
  // Thursday 2026-10-08, 14:00-16:00 EDT (UTC-4), stored as the host's wall-clock time.
  const partialDay = [outOfOfficeEntry("2026-10-08T14:00:00.000Z", "2026-10-08T16:00:00.000Z")];
  const wholeDay = [outOfOfficeEntry("2026-10-08T00:00:00.000Z", "2026-10-08T23:59:59.999Z")];

  beforeEach(() => {
    vi.setSystemTime(new Date("2026-10-01T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects a booking inside the window with the same error a whole-day entry gives", async () => {
    await expect(
      ensureAvailableUsers(
        eventTypeWith(partialDay),
        bookingBetween("2026-10-08T18:00:00.000Z", "2026-10-08T19:00:00.000Z"),
        log
      )
    ).rejects.toThrow(ErrorCode.NoAvailableUsersFound);

    await expect(
      ensureAvailableUsers(
        eventTypeWith(wholeDay),
        bookingBetween("2026-10-08T18:00:00.000Z", "2026-10-08T19:00:00.000Z"),
        log
      )
    ).rejects.toThrow(ErrorCode.NoAvailableUsersFound);
  });

  it("rejects a booking that straddles the leave time", async () => {
    await expect(
      ensureAvailableUsers(
        eventTypeWith(partialDay),
        bookingBetween("2026-10-08T17:30:00.000Z", "2026-10-08T18:30:00.000Z"),
        log
      )
    ).rejects.toThrow(ErrorCode.NoAvailableUsersFound);
  });

  it("accepts a booking that ends at the leave time and one that starts at the return time", async () => {
    const [beforeTheWindow] = await ensureAvailableUsers(
      eventTypeWith(partialDay),
      bookingBetween("2026-10-08T17:00:00.000Z", "2026-10-08T18:00:00.000Z"),
      log
    );
    expect(beforeTheWindow.id).toBe(1);

    const [afterTheWindow] = await ensureAvailableUsers(
      eventTypeWith(partialDay),
      bookingBetween("2026-10-08T20:00:00.000Z", "2026-10-08T21:00:00.000Z"),
      log
    );
    expect(afterTheWindow.id).toBe(1);
  });
});
