import type { TFunction } from "i18next";
import renderEmail from "../src/renderEmail";
import BaseEmail from "./_base-email";

export type AttendeeRunningLateEmailData = {
  attendee: {
    name: string;
    email: string;
    timeZone: string;
    locale: string;
  };
  hostName: string;
  hostEmail: string;
  eventTitle: string;
  startTime: Date;
  delayMinutes: number;
  message?: string;
  t: TFunction;
};

export default class AttendeeRunningLateEmail extends BaseEmail {
  constructor(private data: AttendeeRunningLateEmailData) {
    super();
    this.name = "SEND_RUNNING_LATE_EMAIL";
  }

  protected getTimezone(): string {
    return this.data.attendee.timeZone;
  }

  protected getLocale(): string {
    return this.data.attendee.locale;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    const { t, attendee, hostName, hostEmail, eventTitle, delayMinutes, message } = this.data;
    const originalStart = `${this.getFormattedRecipientTime({
      time: this.data.startTime.toISOString(),
      format: "dddd, LL LT",
    })} (${attendee.timeZone})`;
    const delay = t("running_late_delay_minutes", { count: delayMinutes });

    const textLines = [
      t("running_late_email_title", { hostName, interpolation: { escapeValue: false } }),
      `${t("what")}: ${eventTitle}`,
      `${t("running_late_original_start")}: ${originalStart}`,
      `${t("running_late_expected_delay")}: ${delay}`,
      ...(message ? [`${t("running_late_message_from_host")}: ${message}`] : []),
    ];

    return {
      to: `${attendee.name} <${attendee.email}>`,
      from: `${hostName} <${this.getMailerOptions().from}>`,
      replyTo: hostEmail,
      subject: t("running_late_subject", {
        hostName,
        eventTitle,
        interpolation: { escapeValue: false },
      }),
      html: await renderEmail("AttendeeRunningLateEmail", {
        hostName,
        eventTitle,
        originalStart,
        delay,
        message,
        t,
      }),
      text: textLines.join("\n"),
    };
  }
}
