import type { TFunction } from "i18next";
import { BaseEmailHtml, CallToAction } from "../components";

export const WaitlistSpotOpenedEmail = (
  props: {
    name: string;
    eventTitle: string;
    when: string;
    expiresAt: string;
    claimUrl: string;
    leaveUrl: string;
    t: TFunction;
  } & Partial<React.ComponentProps<typeof BaseEmailHtml>>
) => {
  const { t } = props;
  return (
    <BaseEmailHtml
      subject={t("waitlist_spot_opened_subject", { eventTitle: props.eventTitle })}
      title={t("waitlist_spot_opened_title")}>
      <p style={{ fontWeight: 400, lineHeight: "24px" }}>{t("hi_user_name", { name: props.name })},</p>
      <p style={{ fontWeight: 400, lineHeight: "24px" }}>
        {t("waitlist_spot_opened_body", {
          eventTitle: props.eventTitle,
          when: props.when,
          expiresAt: props.expiresAt,
          interpolation: { escapeValue: false },
        })}
      </p>
      <div style={{ marginTop: "24px", display: "flex", gap: "12px" }}>
        <CallToAction label={t("waitlist_claim_spot")} href={props.claimUrl} />
        <CallToAction label={t("waitlist_leave")} href={props.leaveUrl} secondary />
      </div>
    </BaseEmailHtml>
  );
};
