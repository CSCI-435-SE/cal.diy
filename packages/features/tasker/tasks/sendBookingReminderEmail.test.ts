import { sendBookingReminderEmails } from "@calcom/emails/email-manager";
import { getBooking } from "@calcom/features/bookings/lib/payment/getBooking";
import { BookingStatus } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendBookingReminderEmail } from "./sendBookingReminderEmail";

vi.mock("@calcom/emails/email-manager", () => ({
  sendBookingReminderEmails: vi.fn(),
}));

vi.mock("@calcom/features/bookings/lib/payment/getBooking", () => ({
  getBooking: vi.fn(),
}));

const scheduledStart = new Date("2026-10-10T15:00:00.000Z");
const evt = { title: "Intro call" };
const eventType = { metadata: { disableStandardEmails: undefined } };

function mockBooking(booking: { status: BookingStatus; startTime: Date }) {
  vi.mocked(getBooking).mockResolvedValue({ booking, evt, eventType } as unknown as Awaited<
    ReturnType<typeof getBooking>
  >);
}

const payload = JSON.stringify({ bookingId: 42, startTime: scheduledStart.toISOString() });

describe("sendBookingReminderEmail task", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("emails the host and attendees when the booking is still accepted at the scheduled time", async () => {
    mockBooking({ status: BookingStatus.ACCEPTED, startTime: scheduledStart });

    await sendBookingReminderEmail(payload);

    expect(getBooking).toHaveBeenCalledWith(42);
    expect(sendBookingReminderEmails).toHaveBeenCalledWith(evt, eventType.metadata);
  });

  it("does not send when the booking was cancelled", async () => {
    mockBooking({ status: BookingStatus.CANCELLED, startTime: scheduledStart });

    await sendBookingReminderEmail(payload);

    expect(sendBookingReminderEmails).not.toHaveBeenCalled();
  });

  it("does not send when the booking was moved to a different time", async () => {
    mockBooking({ status: BookingStatus.ACCEPTED, startTime: new Date("2026-10-11T15:00:00.000Z") });

    await sendBookingReminderEmail(payload);

    expect(sendBookingReminderEmails).not.toHaveBeenCalled();
  });

  it("rejects malformed payloads", async () => {
    await expect(sendBookingReminderEmail(JSON.stringify({ bookingId: "nope" }))).rejects.toThrow();
    expect(getBooking).not.toHaveBeenCalled();
  });
});
