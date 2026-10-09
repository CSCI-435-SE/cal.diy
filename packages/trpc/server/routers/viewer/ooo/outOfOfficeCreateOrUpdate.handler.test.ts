import prisma from "@calcom/prisma";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { outOfOfficeCreateOrUpdate } from "./outOfOfficeCreateOrUpdate.handler";

vi.mock("@calcom/prisma", () => {
  const mockObj = {
    outOfOfficeEntry: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  };
  return {
    default: mockObj,
    prisma: mockObj,
  };
});

// Setup mocks to control the implementations
const prismaMock = {
  outOfOfficeEntry: {
    findFirst: vi.fn().mockResolvedValue(undefined),
    findUnique: vi.fn().mockResolvedValue(undefined),
    upsert: vi.fn().mockResolvedValue(undefined),
  },
};

// Override the default mocks with your controlled mocks
vi.spyOn(prisma.outOfOfficeEntry, "findFirst").mockImplementation(prismaMock.outOfOfficeEntry.findFirst);
vi.spyOn(prisma.outOfOfficeEntry, "findUnique").mockImplementation(prismaMock.outOfOfficeEntry.findUnique);
vi.spyOn(prisma.outOfOfficeEntry, "upsert").mockImplementation(prismaMock.outOfOfficeEntry.upsert);

afterEach(() => {
  prismaMock.outOfOfficeEntry.findFirst.mockClear();
  prismaMock.outOfOfficeEntry.findUnique.mockClear();
  prismaMock.outOfOfficeEntry.upsert.mockClear();
});

const mockUser = {
  id: 4,
  username: "pro",
  email: "pro@example.com",
  password: {
    hash: "",
    userId: 0,
  },
  completedOnboarding: true,
  identityProvider: "CAL",
  profiles: [],
  avatar: "",
  organization: null,
  organizationId: null,
  locale: "en",
  timeZone: "UTC",
  defaultScheduleId: null,
  email_verified: true,
  name: null,
  theme: null,
} as const;

describe("outOfOfficeCreateOrUpdate", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.setSystemTime(new Date("2024-11-22T03:23:45Z"));
  });

  it("should throw error if start date is after end date", async () => {
    const input = {
      dateRange: {
        startDate: new Date("2024-11-23T23:00:00.000Z"),
        endDate: new Date("2024-11-22T23:00:00.000Z"),
      },
      startDateOffset: 60,
      endDateOffset: 60,
      reasonId: 1,
      notes: "",
      toTeamUserId: null,
    };

    await expect(outOfOfficeCreateOrUpdate({ ctx: { user: mockUser }, input })).rejects.toThrow(
      "start_date_must_be_before_end_date"
    );
  });

  // Local midnight on 2026-10-07 in America/New_York (UTC-4), as the form sends it.
  const newYorkInput = {
    dateRange: {
      startDate: new Date("2026-10-07T04:00:00.000Z"),
      endDate: new Date("2026-10-07T04:00:00.000Z"),
    },
    startDateOffset: -240,
    endDateOffset: -240,
    reasonId: 1,
    notes: "",
    toTeamUserId: null,
  };

  const upsertedWith = (key: "create" | "update", start: string, end: string) =>
    expect(prisma.outOfOfficeEntry.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ [key]: expect.objectContaining({ start, end }) })
    );

  it("stores the chosen times as the host's wall-clock time when startTime and endTime are given", async () => {
    await outOfOfficeCreateOrUpdate({
      ctx: { user: mockUser },
      input: { ...newYorkInput, startTime: "14:00", endTime: "16:00" },
    });

    upsertedWith("create", "2026-10-07T14:00:00.000Z", "2026-10-07T16:00:00.000Z");
  });

  it("re-saves an entry created before times existed without moving its start or end", async () => {
    // The list seeds the edit form of a stored 2026-10-07T00:00:00.000Z - 2026-10-09T23:59:59.999Z entry
    // as local midnights and sends no times.
    await outOfOfficeCreateOrUpdate({
      ctx: { user: mockUser },
      input: {
        ...newYorkInput,
        uuid: "existing-entry",
        dateRange: { ...newYorkInput.dateRange, endDate: new Date("2026-10-09T04:00:00.000Z") },
      },
    });

    upsertedWith("update", "2026-10-07T00:00:00.000Z", "2026-10-09T23:59:59.999Z");
  });

  it("treats an end time of 23:59 as the end of that day", async () => {
    await outOfOfficeCreateOrUpdate({
      ctx: { user: mockUser },
      input: { ...newYorkInput, startTime: "00:00", endTime: "23:59" },
    });

    upsertedWith("create", "2026-10-07T00:00:00.000Z", "2026-10-07T23:59:59.999Z");
  });

  it("lets a window run past midnight into the next day", async () => {
    await outOfOfficeCreateOrUpdate({
      ctx: { user: mockUser },
      input: {
        ...newYorkInput,
        dateRange: { ...newYorkInput.dateRange, endDate: new Date("2026-10-08T04:00:00.000Z") },
        startTime: "23:00",
        endTime: "02:00",
      },
    });

    upsertedWith("create", "2026-10-07T23:00:00.000Z", "2026-10-08T02:00:00.000Z");
  });

  it("rejects an end time that is not after the start time on the same day", async () => {
    await expect(
      outOfOfficeCreateOrUpdate({
        ctx: { user: mockUser },
        input: { ...newYorkInput, startTime: "16:00", endTime: "14:00" },
      })
    ).rejects.toThrow("start_date_must_be_before_end_date");
    await expect(
      outOfOfficeCreateOrUpdate({
        ctx: { user: mockUser },
        input: { ...newYorkInput, startTime: "14:00", endTime: "14:00" },
      })
    ).rejects.toThrow("start_date_must_be_before_end_date");
    expect(prisma.outOfOfficeEntry.upsert).not.toHaveBeenCalled();
  });

  it("should handle timezone offset correctly", async () => {
    const input = {
      dateRange: {
        startDate: new Date("2025-03-28T23:00:00.000Z"),
        endDate: new Date("2025-04-01T22:00:00.000Z"),
      },
      startDateOffset: 60, // Paris timezone (CET)
      endDateOffset: 120, // Paris timezone (CEST) <- After summer time begins
      reasonId: 1,
      notes: "",
      toTeamUserId: null,
    };
    const startTimeUtc = "2025-03-29T00:00:00.000Z";
    const endTimeUtc = "2025-04-02T23:59:59.999Z";

    await outOfOfficeCreateOrUpdate({
      ctx: { user: mockUser },
      input,
    });

    expect(prisma.outOfOfficeEntry.findFirst).toHaveBeenNthCalledWith(1, {
      select: {
        toUserId: true,
        userId: true,
      },
      where: {
        OR: [
          {
            AND: [
              {
                start: {
                  lte: endTimeUtc,
                },
              },
              {
                end: {
                  gte: startTimeUtc,
                },
              },
            ],
          },
          {
            AND: [
              {
                start: {
                  gte: startTimeUtc,
                },
              },
              {
                end: {
                  lte: endTimeUtc,
                },
              },
            ],
          },
        ],
        toUserId: 4,
      },
    });
  });
});
