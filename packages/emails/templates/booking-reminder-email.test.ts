import type { CalendarEvent, Person } from "@calcom/types/Calendar";
import type { TFunction } from "i18next";
import { describe, expect, it } from "vitest";
import AttendeeBookingReminderEmail from "./attendee-booking-reminder-email";
import OrganizerBookingReminderEmail from "./organizer-booking-reminder-email";

const t = ((key: string, vars?: Record<string, unknown>) =>
  key === "booking_reminder_subject" ? `Reminder: ${vars?.title} at ${vars?.date}` : key) as TFunction;

const person = (name: string, email: string): Person => ({
  name,
  email,
  timeZone: "UTC",
  language: { translate: t, locale: "en" },
});

const organizer = person("Host", "host@example.com");
const attendee = person("Guest", "guest@example.com");

const calEvent = {
  type: "intro",
  title: "Intro call",
  startTime: "2026-10-10T15:00:00.000Z",
  endTime: "2026-10-10T15:30:00.000Z",
  organizer,
  attendees: [attendee],
} as CalendarEvent;

class TestAttendeeReminder extends AttendeeBookingReminderEmail {
  getPayload() {
    return this.getNodeMailerPayload();
  }
}

class TestOrganizerReminder extends OrganizerBookingReminderEmail {
  getPayload() {
    return this.getNodeMailerPayload();
  }
}

describe("booking reminder emails", () => {
  it("sends the attendee a reminder without re-attaching the calendar invite", async () => {
    const payload = await new TestAttendeeReminder(calEvent, attendee).getPayload();

    expect(payload.to).toBe("Guest <guest@example.com>");
    expect(payload.subject).toMatch(/^Reminder: Intro call at 3:00pm - 3:30pm, saturday, october 10, 2026$/);
    expect(payload.icalEvent).toBeUndefined();
    expect(payload.html).toContain("booking_reminder_title");
    expect(payload.text).toContain("booking_reminder_title");
  });

  it("sends the host a reminder without re-attaching the calendar invite", async () => {
    const payload = await new TestOrganizerReminder({ calEvent }).getPayload();

    expect(payload.to).toBe("host@example.com");
    expect(payload.subject).toMatch(/^Reminder: Intro call at /);
    expect(payload.icalEvent).toBeUndefined();
    expect(payload.html).toContain("booking_reminder_title");
  });
});
