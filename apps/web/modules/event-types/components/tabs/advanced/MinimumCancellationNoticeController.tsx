import type { FormValues } from "@calcom/features/eventtypes/lib/types";
import { useFlagMap } from "@calcom/features/flags/context/provider";
import ServerTrans from "@calcom/lib/components/ServerTrans";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { Input, SettingsToggle } from "@calcom/ui/components/form";
import { RadioField } from "@calcom/ui/components/radio";
import * as RadioGroup from "@radix-ui/react-radio-group";
import { useState } from "react";
import { useFormContext } from "react-hook-form";

const DEFAULT_NOTICE_MINUTES = 60;

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
  // Remembers the last valid minutes so switching back to the notice option restores it.
  const [noticeMinutes, setNoticeMinutes] = useState(hasNotice ? value : DEFAULT_NOTICE_MINUTES);

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
                onValueChange={(option) => onChange(option === "notice" ? noticeMinutes : null)}>
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
                        i18nKey="only_when_at_least_minutes_before_meeting"
                        components={[
                          <div key="cancellation-notice-minutes" className="mx-2 inline-flex items-center">
                            <Input
                              type="number"
                              min={1}
                              step={1}
                              aria-label={t("minimum_cancellation_notice")}
                              data-testid="minimum-cancellation-notice-input"
                              defaultValue={noticeMinutes}
                              onChange={(event) => {
                                const minutes = Number(event.target.value);
                                if (!Number.isInteger(minutes) || minutes <= 0) return;
                                setNoticeMinutes(minutes);
                                onChange(minutes);
                              }}
                              className="m-0! block w-20 border-default text-sm [appearance:textfield] focus:z-10"
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
  // Kept out of the event type form until the backend can store and enforce it,
  // so saving the event type never sends a value the server would ignore.
  const [minimumCancellationNotice, setMinimumCancellationNotice] = useState<number | null>(null);

  if (!flags["minimum-cancellation-notice"] || isCancellingDisabled) return null;

  return (
    <MinimumCancellationNoticeController
      value={minimumCancellationNotice}
      onChange={setMinimumCancellationNotice}
    />
  );
}
