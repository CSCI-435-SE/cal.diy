import dayjs from "@calcom/dayjs";
import { EMAIL_FROM_NAME } from "@calcom/lib/constants";
import type { TFunction } from "i18next";
import renderEmail from "../src/renderEmail";
import BaseEmail from "./_base-email";

export type WaitlistSpotOpenedEmailData = {
  name: string;
  email: string;
  timeZone: string;
  eventTitle: string;
  offerStart: Date;
  offerExpiresAt: Date;
  claimUrl: string;
  leaveUrl: string;
  t: TFunction;
};

export default class WaitlistSpotOpenedEmail extends BaseEmail {
  constructor(private data: WaitlistSpotOpenedEmailData) {
    super();
    this.name = "WAITLIST_SPOT_OPENED";
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    const { t } = this.data;
    const format = (date: Date) => dayjs(date).tz(this.data.timeZone).format("dddd, MMMM D, YYYY h:mma z");
    const props = {
      name: this.data.name,
      eventTitle: this.data.eventTitle,
      when: format(this.data.offerStart),
      expiresAt: format(this.data.offerExpiresAt),
      claimUrl: this.data.claimUrl,
      leaveUrl: this.data.leaveUrl,
    };
    return {
      to: `${this.data.name} <${this.data.email}>`,
      from: `${EMAIL_FROM_NAME} <${this.getMailerOptions().from}>`,
      subject: t("waitlist_spot_opened_subject", { eventTitle: this.data.eventTitle }),
      html: await renderEmail("WaitlistSpotOpenedEmail", { ...props, t }),
      text: `${t("waitlist_spot_opened_body", { ...props, interpolation: { escapeValue: false } })}\n\n${t(
        "waitlist_claim_spot"
      )}: ${props.claimUrl}\n${t("waitlist_leave")}: ${props.leaveUrl}`,
    };
  }
}
