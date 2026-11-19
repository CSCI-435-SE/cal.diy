import type { FormValues } from "@calcom/features/eventtypes/lib/types";
import { useFlagMap } from "@calcom/features/flags/context/provider";
import ServerTrans from "@calcom/lib/components/ServerTrans";
import { MINUTES_IN_HOUR } from "@calcom/lib/convertToNewDurationType";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { Input, Select, SettingsToggle } from "@calcom/ui/components/form";
import { RadioField } from "@calcom/ui/components/radio";
import * as RadioGroup from "@radix-ui/react-radio-group";
import { useState } from "react";
import { useFormContext } from "react-hook-form";

const DEFAULT_NOTICE_MINUTES = 60;

type NoticeUnit = "minutes" | "hours";
type NoticeInput = { amount: number; unit: NoticeUnit };

// The database stores minutes; whole hours are shown as hours so a 1440-minute notice reopens as "24 hours".
function toNoticeInput(minutes: number | null): NoticeInput {
  if (minutes === null || minutes <= 0) return { amount: DEFAULT_NOTICE_MINUTES, unit: "minutes" };
  if (minutes % MINUTES_IN_HOUR === 0) return { amount: minutes / MINUTES_IN_HOUR, unit: "hours" };
  return { amount: minutes, unit: "minutes" };
}

function toMinutes({ amount, unit }: NoticeInput): number {
  return unit === "hours" ? amount * MINUTES_IN_HOUR : amount;
}

type MinimumCancellationNoticeControllerProps = {
  /** Minutes before the start time when attendees can no longer cancel. `null` means always allowed. */
  value: number | null;
  onChange: (minutes: number | null) => void;
};

export function MinimumCancellationNoticeController({
  value,
  onChange,
}: MinimumCancellationNoticeControllerProps) {
  const { t } = useLocale();
  const hasNotice = value !== null && value > 0;
  const [isExpanded, setIsExpanded] = useState(hasNotice);
  // Remembers the last valid notice so switching back to the notice option restores it.
  const [notice, setNotice] = useState<NoticeInput>(() => toNoticeInput(value));
  const unitOptions: { value: NoticeUnit; label: string }[] = [
    { value: "minutes", label: t("minutes") },
    { value: "hours", label: t("hours") },
  ];

  const selectNotice = (nextNotice: NoticeInput) => {
    setNotice(nextNotice);
    onChange(toMinutes(nextNotice));
  };

  return (
    <div className="block items-start sm:flex">
      <div className="w-full">
        <SettingsToggle
          labelClassName="text-sm"
          toggleSwitchAtTheEnd={true}
          switchContainerClassName={classNames(
            "border-subtle rounded-lg border py-6 px-4 sm:px-6",
            isExpanded && "rounded-b-none"
          )}
          childrenClassName="lg:ml-0"
          title={t("minimum_cancellation_notice")}
          description={t("minimum_cancellation_notice_description")}
          data-testid="minimum-cancellation-notice-toggle"
          checked={isExpanded}
          onCheckedChange={(checked) => {
            setIsExpanded(checked);
            onChange(null);
          }}>
          {isExpanded && (
            <div className="rounded-b-lg border border-subtle border-t-0 p-6">
              <RadioGroup.Root
                value={hasNotice ? "notice" : "always"}
                onValueChange={(option) => onChange(option === "notice" ? toMinutes(notice) : null)}>
                <div className="flex flex-col flex-wrap justify-start gap-y-2">
                  {/* Ids differ from DisableReschedulingController's "always"/"notice" because both render on the same page */}
                  <RadioField
                    label={t("always_allow_cancellations")}
                    id="cancellation-always"
                    value="always"
                  />
                  <RadioField
                    className="items-center"
                    label={
                      <ServerTrans
                        t={t}
                        i18nKey="only_when_at_least_before_meeting"
                        components={[
                          <div
                            key="cancellation-notice-amount"
                            className="mx-2 inline-flex items-center gap-2">
                            <Input
                              type="number"
                              min={1}
                              step={1}
                              aria-label={t("minimum_cancellation_notice")}
                              data-testid="minimum-cancellation-notice-input"
                              defaultValue={notice.amount}
                              onChange={(event) => {
                                const amount = Number(event.target.value);
                                if (!Number.isInteger(amount) || amount <= 0) return;
                                selectNotice({ ...notice, amount });
                              }}
                              className="m-0! block w-20 border-default text-sm [appearance:textfield] focus:z-10"
                            />
                            <Select
                              isSearchable={false}
                              aria-label={t("minimum_cancellation_notice_unit")}
                              className="w-32 capitalize"
                              value={unitOptions.find((option) => option.value === notice.unit)}
                              onChange={(option) => {
                                if (option) selectNotice({ ...notice, unit: option.value });
                              }}
                              options={unitOptions}
                            />
                          </div>,
                        ]}
                      />
                    }
                    id="cancellation-notice"
                    value="notice"
                  />
                </div>
              </RadioGroup.Root>
            </div>
          )}
        </SettingsToggle>
      </div>
    </div>
  );
}

export default function MinimumCancellationNoticeSetting() {
  const flags = useFlagMap();
  const formMethods = useFormContext<FormValues>();
  const isCancellingDisabled = formMethods.watch("disabledCancelling");
  const minimumCancellationNotice = formMethods.watch("minimumCancellationNotice");

  if (!flags["minimum-cancellation-notice"] || isCancellingDisabled) return null;

  return (
    <MinimumCancellationNoticeController
      value={minimumCancellationNotice ?? null}
      onChange={(minutes) =>
        formMethods.setValue("minimumCancellationNotice", minutes, { shouldDirty: true })
      }
    />
  );
}
