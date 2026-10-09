import dayjs from "@calcom/dayjs";
import getSlots from "@calcom/features/schedules/lib/slots";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GetUserAvailabilityInitialData } from "./getUserAvailability";
import { UserAvailabilityService } from "./getUserAvailability";

vi.mock("@calcom/features/di/containers/BusyTimes", () => ({
  getBusyTimesService: vi.fn(() => ({
    getBusyTimes: vi.fn().mockResolvedValue([]),
  })),
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

const timeZone = "America/New_York";

// Monday to Friday, 09:00-17:00 in America/New_York.
const user: NonNullable<GetUserAvailabilityInitialData["user"]> = {
  id: 1,
  username: "host",
  email: "host@example.com",
  bufferTime: 0,
  timeZone,
  availability: [],
  timeFormat: 24,
  defaultScheduleId: 1,
  isPlatformManaged: false,
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
};

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

// Wednesday 2026-10-07 to Friday 2026-10-09. EDT is UTC-4, so 09:00-17:00 is 13:00Z-21:00Z.
const params = {
  dateFrom: dayjs("2026-10-07T00:00:00Z"),
  dateTo: dayjs("2026-10-09T23:59:59Z"),
  returnDateOverrides: false,
};

const rangesOn = (ranges: { start: dayjs.Dayjs; end: dayjs.Dayjs }[], date: string) =>
  ranges
    .filter((range) => range.start.tz(timeZone).format("YYYY-MM-DD") === date)
    .map((range) => [range.start.toISOString(), range.end.toISOString()]);

describe("getUserAvailability with out-of-office times", () => {
  let service: UserAvailabilityService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.setSystemTime(new Date("2026-10-01T12:00:00Z"));
    service = new UserAvailabilityService(mockDependencies);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("blocks only the window of a partial-day entry and leaves the day off the away map", async () => {
    const result = await service.getUserAvailability(params, {
      user,
      outOfOfficeDays: [outOfOfficeEntry("2026-10-08T14:00:00.000Z", "2026-10-08T16:00:00.000Z")],
    });

    expect(rangesOn(result.dateRanges, "2026-10-08")).toEqual([
      ["2026-10-08T13:00:00.000Z", "2026-10-08T18:00:00.000Z"],
      ["2026-10-08T20:00:00.000Z", "2026-10-08T21:00:00.000Z"],
    ]);
    expect(rangesOn(result.oooExcludedDateRanges, "2026-10-08")).toEqual(
      rangesOn(result.dateRanges, "2026-10-08")
    );
    expect(rangesOn(result.dateRanges, "2026-10-07")).toEqual([
      ["2026-10-07T13:00:00.000Z", "2026-10-07T21:00:00.000Z"],
    ]);
    expect(rangesOn(result.dateRanges, "2026-10-09")).toEqual([
      ["2026-10-09T13:00:00.000Z", "2026-10-09T21:00:00.000Z"],
    ]);
    expect(result.datesOutOfOffice).toEqual({});
  });

  it("offers the slot that ends at the leave time and none that overlaps the window", async () => {
    const result = await service.getUserAvailability(params, {
      user,
      outOfOfficeDays: [outOfOfficeEntry("2026-10-08T14:00:00.000Z", "2026-10-08T16:00:00.000Z")],
    });

    const slots = getSlots({
      inviteeDate: dayjs.tz("2026-10-08T00:00:00", timeZone),
      frequency: 60,
      eventLength: 60,
      minimumBookingNotice: 0,
      offsetStart: 0,
      dateRanges: result.dateRanges.filter(
        (range) => range.start.tz(timeZone).format("YYYY-MM-DD") === "2026-10-08"
      ),
    });

    // 09:00 to 13:00 EDT start a one-hour slot that ends by 14:00; 16:00 EDT is the first slot after the return.
    expect(slots.map((slot) => slot.time.toISOString())).toEqual([
      "2026-10-08T13:00:00.000Z",
      "2026-10-08T14:00:00.000Z",
      "2026-10-08T15:00:00.000Z",
      "2026-10-08T16:00:00.000Z",
      "2026-10-08T17:00:00.000Z",
      "2026-10-08T20:00:00.000Z",
    ]);
  });

  it("keeps a whole-day entry on the away map and out of the OOO-excluded ranges", async () => {
    const result = await service.getUserAvailability(params, {
      user,
      outOfOfficeDays: [outOfOfficeEntry("2026-10-08T00:00:00.000Z", "2026-10-08T23:59:59.999Z")],
    });

    expect(result.datesOutOfOffice).toEqual({
      "2026-10-08": {
        fromUser: { id: 1, displayName: "Host" },
        toUser: null,
        reason: null,
        emoji: null,
        notes: null,
        showNotePublicly: false,
      },
    });
    expect(rangesOn(result.dateRanges, "2026-10-08")).toEqual([
      ["2026-10-08T13:00:00.000Z", "2026-10-08T21:00:00.000Z"],
    ]);
    expect(rangesOn(result.oooExcludedDateRanges, "2026-10-08")).toEqual([]);
  });

  it("blocks a window that runs past midnight across both days", async () => {
    const result = await service.getUserAvailability(params, {
      user,
      outOfOfficeDays: [outOfOfficeEntry("2026-10-07T16:00:00.000Z", "2026-10-08T10:00:00.000Z")],
    });

    expect(rangesOn(result.dateRanges, "2026-10-07")).toEqual([
      ["2026-10-07T13:00:00.000Z", "2026-10-07T20:00:00.000Z"],
    ]);
    expect(rangesOn(result.dateRanges, "2026-10-08")).toEqual([
      ["2026-10-08T14:00:00.000Z", "2026-10-08T21:00:00.000Z"],
    ]);
    expect(result.datesOutOfOffice).toEqual({});
  });
});
