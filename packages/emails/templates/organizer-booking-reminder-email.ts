import type { CalendarEvent, Person } from "@calcom/types/Calendar";
import renderEmail from "../src/renderEmail";
import OrganizerScheduledEmail from "./organizer-scheduled-email";

export default class OrganizerBookingReminderEmail extends OrganizerScheduledEmail {
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

  async getHtml(calEvent: CalendarEvent, attendee: Person, teamMember?: Person) {
    return await renderEmail("OrganizerScheduledEmail", {
      calEvent,
      attendee,
      teamMember,
      title: "booking_reminder_title",
    });
  }
}
