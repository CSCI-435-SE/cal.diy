import type { TFunction } from "i18next";
import { BaseEmailHtml, Info } from "../components";

export const AttendeeRunningLateEmail = (
  props: {
    hostName: string;
    eventTitle: string;
    originalStart: string;
    delay: string;
    message?: string;
    t: TFunction;
  } & Partial<React.ComponentProps<typeof BaseEmailHtml>>
) => {
  const { t, hostName, eventTitle, originalStart, delay, message } = props;
  return (
    <BaseEmailHtml
      headerType="calendarCircle"
      subject={t("running_late_subject", {
        hostName,
        eventTitle,
        interpolation: { escapeValue: false },
      })}
      title={t("running_late_email_title", { hostName, interpolation: { escapeValue: false } })}>
      <Info label={t("what")} description={eventTitle} withSpacer />
      <Info label={t("running_late_original_start")} description={originalStart} withSpacer />
      <Info label={t("running_late_expected_delay")} description={delay} withSpacer />
      <Info label={t("running_late_message_from_host")} description={message} withSpacer />
    </BaseEmailHtml>
  );
};
