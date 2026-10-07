import type { CalendarEvent, Person } from "@calcom/types/Calendar";
import renderEmail from "../src/renderEmail";
import AttendeeScheduledEmail from "./attendee-scheduled-email";

export default class AttendeeBookingReminderEmail extends AttendeeScheduledEmail {
  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    const payload = await super.getNodeMailerPayload();
    return {
      ...payload,
      // The invite was already delivered at booking time; re-attaching it would prompt a calendar update
      icalEvent: undefined,
      subject: this.t("booking_reminder_subject", {
        title: this.calEvent.title,
        date: this.getFormattedDate(),
        interpolation: { escapeValue: false },
      }),
      text: this.getTextBody("booking_reminder_title"),
    };
  }

  async getHtml(calEvent: CalendarEvent, attendee: Person) {
    return await renderEmail("AttendeeScheduledEmail", {
      calEvent,
      attendee,
      title: "booking_reminder_title",
    });
  }
}
