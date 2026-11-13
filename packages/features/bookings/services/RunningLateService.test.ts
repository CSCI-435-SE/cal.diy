import { BookingStatus } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BookingRepository } from "../repositories/BookingRepository";
import { RunningLateService } from "./RunningLateService";

const { emailConstructor, sendEmail } = vi.hoisted(() => ({
  emailConstructor: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock("@calcom/emails/templates/attendee-running-late-email", () => ({
  default: class {
    constructor(data: unknown) {
      emailConstructor(data);
    }
    sendEmail() {
      return sendEmail();
    }
  },
}));

vi.mock("@calcom/i18n/server", () => ({
  getTranslation: vi.fn(async (locale: string) => (key: string) => `${locale}:${key}`),
}));

type BookingRow = NonNullable<
  Awaited<ReturnType<BookingRepository["findByIdIncludeUserAndAttendeeTimeZones"]>>
>;

const HOST_ID = 1;
const now = new Date("2026-11-12T12:00:00Z");
const MINUTE = 60 * 1000;

function buildBooking(overrides: Partial<BookingRow> = {}): BookingRow {
  const startTime = new Date(now.getTime() + 30 * MINUTE);
  return {
    id: 10,
    uid: "booking-uid",
    title: "Intro call between Host and Ana",
    status: BookingStatus.ACCEPTED,
    startTime,
    endTime: new Date(startTime.getTime() + 30 * MINUTE),
    userId: HOST_ID,
    user: { name: "Host", email: "host@example.com" },
    attendees: [{ name: "Ana", email: "ana@example.com", timeZone: "Asia/Tokyo", locale: "ja" }],
    ...overrides,
  };
}

function setup(booking: BookingRow | null) {
  const bookingRepository = {
    findByIdIncludeUserAndAttendeeTimeZones: vi.fn().mockResolvedValue(booking),
  } as unknown as BookingRepository;
  const service = new RunningLateService({ bookingRepository });
  return { service };
}

const sendInput = { bookingId: 10, userId: HOST_ID, delayMinutes: 10 as const, now };

describe("RunningLateService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendEmail.mockResolvedValue(undefined);
  });

  describe("validation", () => {
    it("throws when the booking does not exist", async () => {
      const { service } = setup(null);

      await expect(service.sendNotice(sendInput)).rejects.toThrow("Booking 10 not found");
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it("rejects a caller who is not the organizer", async () => {
      const { service } = setup(buildBooking());

      await expect(service.sendNotice({ ...sendInput, userId: 99 })).rejects.toThrow(
        "Only the booking's host can send a running late notice"
      );
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it("rejects an attendee who has a Cal account, even though the booking is in their list", async () => {
      const { service } = setup(
        buildBooking({
          attendees: [{ name: "Ana", email: "ana@example.com", timeZone: "UTC", locale: "en" }],
        })
      );

      await expect(service.sendNotice({ ...sendInput, userId: 2 })).rejects.toThrow(
        "Only the booking's host can send a running late notice"
      );
    });

    it("rejects bookings that are not accepted", async () => {
      const { service } = setup(buildBooking({ status: BookingStatus.PENDING }));

      await expect(service.sendNotice(sendInput)).rejects.toThrow("only be sent for accepted bookings");
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it("rejects bookings more than 2 hours away", async () => {
      const startTime = new Date(now.getTime() + 3 * 60 * MINUTE);
      const { service } = setup(
        buildBooking({ startTime, endTime: new Date(startTime.getTime() + 30 * MINUTE) })
      );

      await expect(service.sendNotice(sendInput)).rejects.toThrow("within 2 hours");
      expect(sendEmail).not.toHaveBeenCalled();
    });
  });

  describe("recipients", () => {
    it("skips the sender regardless of email casing and de-duplicates attendees", async () => {
      const { service } = setup(
        buildBooking({
          attendees: [
            { name: "Ana", email: "ana@example.com", timeZone: "UTC", locale: "en" },
            { name: "Host", email: "HOST@example.com", timeZone: "UTC", locale: "en" },
            { name: "Ana again", email: "Ana@Example.com", timeZone: "UTC", locale: "en" },
            { name: "Co-host", email: "cohost@example.com", timeZone: "UTC", locale: "en" },
          ],
        })
      );

      const result = await service.sendNotice(sendInput);

      expect(result).toEqual({ sent: 2 });
      const recipients = emailConstructor.mock.calls.map(([data]) => data.attendee.email);
      expect(recipients).toEqual(["ana@example.com", "cohost@example.com"]);
    });

    it("returns zero without sending when the only attendee is the host", async () => {
      const { service } = setup(
        buildBooking({
          attendees: [{ name: "Host", email: "host@example.com", timeZone: "UTC", locale: "en" }],
        })
      );

      await expect(service.sendNotice(sendInput)).resolves.toEqual({ sent: 0 });
      expect(sendEmail).not.toHaveBeenCalled();
    });
  });

  describe("email content", () => {
    it("uses each attendee's own locale and time zone", async () => {
      const { service } = setup(
        buildBooking({
          attendees: [
            { name: "Ana", email: "ana@example.com", timeZone: "Asia/Tokyo", locale: "ja" },
            { name: "Ben", email: "ben@example.com", timeZone: "Europe/Berlin", locale: null },
          ],
        })
      );

      await service.sendNotice({ ...sendInput, message: "  Previous call ran over  " });

      const [ana, ben] = emailConstructor.mock.calls.map(([data]) => data);
      expect(ana.attendee).toEqual({
        name: "Ana",
        email: "ana@example.com",
        timeZone: "Asia/Tokyo",
        locale: "ja",
      });
      expect(ana.t("running_late")).toBe("ja:running_late");
      expect(ben.attendee.locale).toBe("en");
      expect(ben.attendee.timeZone).toBe("Europe/Berlin");
      expect(ana).toMatchObject({
        hostName: "Host",
        hostEmail: "host@example.com",
        eventTitle: "Intro call between Host and Ana",
        delayMinutes: 10,
        message: "Previous call ran over",
      });
    });

    it("drops a whitespace-only message", async () => {
      const { service } = setup(buildBooking());

      await service.sendNotice({ ...sendInput, message: "   " });

      expect(emailConstructor.mock.calls[0][0].message).toBeUndefined();
    });

    it("keeps sending to other attendees when one email fails", async () => {
      sendEmail.mockRejectedValueOnce(new Error("SMTP down")).mockResolvedValue(undefined);
      const { service } = setup(
        buildBooking({
          attendees: [
            { name: "Ana", email: "ana@example.com", timeZone: "UTC", locale: "en" },
            { name: "Ben", email: "ben@example.com", timeZone: "UTC", locale: "en" },
          ],
        })
      );

      await expect(service.sendNotice(sendInput)).resolves.toEqual({ sent: 1 });
      expect(sendEmail).toHaveBeenCalledTimes(2);
    });
  });
});
