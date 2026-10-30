import { LearnMoreLink } from "@calcom/features/eventtypes/components/LearnMoreLink";
import type {
  EventTypeSetup,
  FormValues,
  InputClassNames,
  SelectClassNames,
  SettingsToggleClassNames,
} from "@calcom/features/eventtypes/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { jsDayToRRuleWeekday } from "@calcom/lib/recurringWeekdays";
import { weekdayNames } from "@calcom/lib/weekday";
import { weekStartNum } from "@calcom/lib/weekstart";
import { Frequency } from "@calcom/prisma/zod-utils";
import type { RecurringEvent } from "@calcom/types/Calendar";
import classNames from "@calcom/ui/classNames";
import { Alert } from "@calcom/ui/components/alert";
import { Select, SettingsToggle, TextField } from "@calcom/ui/components/form";
import { useState } from "react";
import { useFormContext } from "react-hook-form";

export type RecurringEventControllerProps = {
  eventType: EventTypeSetup;
  paymentEnabled: boolean;
  customClassNames?: EventRecurringTabCustomClassNames;
  user?: { timeZone: string; weekStart: string };
};

export type EventRecurringTabCustomClassNames = {
  container?: string;
  recurringToggle?: SettingsToggleClassNames;
  frequencyInput?: InputClassNames;
  frequencyUnitSelect?: SelectClassNames;
  maxEventsInput?: {
    countInput?: string;
    labelText?: string;
    suffixText?: string;
    container?: string;
  };
  weekdaysInput?: {
    container?: string;
    label?: string;
    button?: string;
  };
  experimentalAlert?: string;
  paymentAlert?: string;
};

export default function RecurringEventController({
  eventType,
  paymentEnabled,
  customClassNames,
  user,
}: RecurringEventControllerProps) {
  const { t, i18n } = useLocale();
  const formMethods = useFormContext<FormValues>();
  const [recurringEventState, setRecurringEventState] = useState<RecurringEvent | null>(
    formMethods.getValues("recurringEvent")
  );
  const isSeatsOffered = !!formMethods.getValues("seatsPerTimeSlot");
  const hasBookingLimitPerBooker = !!formMethods.getValues("maxActiveBookingsPerBooker");
  /* Just yearly-0, monthly-1 and weekly-2 */
  const recurringEventFreqOptions = Object.entries(Frequency)
    .filter(([key, value]) => Number.isNaN(Number(key)) && Number(value) < 3)
    .map(([key, value]) => ({
      label: t(`${key.toString().toLowerCase()}`, { count: recurringEventState?.interval }),
      value: value.toString(),
    }));

  const recurringLocked = { disabled: false };

  const weekStart = weekStartNum(user?.weekStart);
  const shortDayNames = weekdayNames(i18n.language, weekStart, "short");
  const longDayNames = weekdayNames(i18n.language, weekStart, "long");
  // Saved with the days so the booking side judges "Tuesday" by the host's clock and week.
  const hostWeekContext = user ? { tzid: user.timeZone, wkst: jsDayToRRuleWeekday(weekStart) } : {};

  const toggleWeekday = (rruleWeekday: number) => {
    if (!recurringEventState) return;
    const selected = recurringEventState.byweekday ?? [];
    const byweekday = selected.includes(rruleWeekday)
      ? selected.filter((day) => day !== rruleWeekday)
      : [...selected, rruleWeekday].sort((a, b) => a - b);
    const newVal = { ...recurringEventState, ...hostWeekContext, byweekday };
    formMethods.setValue("recurringEvent", newVal, { shouldDirty: true });
    setRecurringEventState(newVal);
  };

  return (
    <div className={classNames("block items-start sm:flex", customClassNames?.container)}>
      <div className={!paymentEnabled ? "w-full" : ""}>
        {paymentEnabled ? (
          <Alert
            severity="warning"
            className={customClassNames?.paymentAlert}
            title={t("warning_payment_recurring_event")}
          />
        ) : (
          <>
            <Alert
              className={classNames("mb-4", customClassNames?.experimentalAlert)}
              severity="warning"
              title="Experimental: Recurring Events are currently experimental and causes some issues sometimes when checking for availability. We are working on fixing this."
            />
            <SettingsToggle
              labelClassName={classNames("text-sm", customClassNames?.recurringToggle?.label)}
              toggleSwitchAtTheEnd={true}
              switchContainerClassName={classNames(
                "border-subtle rounded-lg border py-6 px-4 sm:px-6",
                recurringEventState !== null && "rounded-b-none",
                customClassNames?.recurringToggle?.container
              )}
              childrenClassName={classNames("lg:ml-0", customClassNames?.recurringToggle?.children)}
              descriptionClassName={customClassNames?.recurringToggle?.description}
              title={t("recurring_event")}
              {...recurringLocked}
              description={
                <LearnMoreLink
                  t={t}
                  i18nKey="recurring_event_description"
                  href="https://cal.com/help/event-types/recurring-events"
                />
              }
              checked={!!recurringEventState}
              data-testid="recurring-event-check"
              disabled={(!recurringEventState && isSeatsOffered) || hasBookingLimitPerBooker}
              tooltip={
                isSeatsOffered
                  ? t("seats_doesnt_support_recurring")
                  : hasBookingLimitPerBooker
                    ? t("booking_limit_per_booker_doesnt_support_recurring")
                    : undefined
              }
              onCheckedChange={(e) => {
                if (!e) {
                  formMethods.setValue("recurringEvent", null, { shouldDirty: true });
                  setRecurringEventState(null);
                } else {
                  const newVal = eventType.recurringEvent || {
                    interval: 1,
                    count: 12,
                    freq: Frequency.WEEKLY,
                    byweekday: [],
                  };
                  formMethods.setValue("recurringEvent", newVal, { shouldDirty: true });
                  setRecurringEventState(newVal);
                }
              }}>
              <div className="rounded-b-lg border border-subtle border-t-0 p-6">
                {recurringEventState && (
                  <div data-testid="recurring-event-collapsible" className="text-sm">
                    <div className="flex items-center">
                      <p
                        className={classNames(
                          "text-emphasis ltr:mr-2 rtl:ml-2",
                          customClassNames?.frequencyInput?.label
                        )}>
                        {t("repeats_every")}
                      </p>
                      <TextField
                        disabled={recurringLocked.disabled}
                        type="number"
                        min="1"
                        max="20"
                        className={classNames("mb-0", customClassNames?.frequencyInput?.input)}
                        defaultValue={recurringEventState.interval}
                        onChange={(event) => {
                          const newVal = {
                            ...recurringEventState,
                            interval: parseInt(event?.target.value, 10),
                          };
                          formMethods.setValue("recurringEvent", newVal, { shouldDirty: true });
                          setRecurringEventState(newVal);
                        }}
                      />
                      <Select
                        options={recurringEventFreqOptions}
                        value={recurringEventFreqOptions[recurringEventState.freq]}
                        isSearchable={false}
                        className={classNames(
                          "ml-2 block w-18 min-w-0 rounded-md text-sm",
                          customClassNames?.frequencyUnitSelect?.select
                        )}
                        innerClassNames={customClassNames?.frequencyUnitSelect?.innerClassNames}
                        isDisabled={recurringLocked.disabled}
                        onChange={(event) => {
                          const newVal = {
                            ...recurringEventState,
                            freq: parseInt(event?.value || `${Frequency.WEEKLY}`, 10),
                          };
                          formMethods.setValue("recurringEvent", newVal, { shouldDirty: true });
                          setRecurringEventState(newVal);
                        }}
                      />
                    </div>
                    {recurringEventState.freq === Frequency.WEEKLY && (
                      <div
                        data-testid="recurring-event-weekdays"
                        className={classNames("mt-4", customClassNames?.weekdaysInput?.container)}>
                        <div className="flex items-center">
                          <p
                            className={classNames(
                              "text-emphasis ltr:mr-2 rtl:ml-2",
                              customClassNames?.weekdaysInput?.label
                            )}>
                            {t("repeats_on")}
                          </p>
                          <div className="flex gap-1">
                            {shortDayNames.map((shortName, index) => {
                              const rruleWeekday = jsDayToRRuleWeekday((index + weekStart) % 7);
                              const isSelected = !!recurringEventState.byweekday?.includes(rruleWeekday);
                              return (
                                <button
                                  key={rruleWeekday}
                                  type="button"
                                  aria-pressed={isSelected}
                                  aria-label={longDayNames[index]}
                                  disabled={recurringLocked.disabled}
                                  onClick={() => toggleWeekday(rruleWeekday)}
                                  className={classNames(
                                    "h-8 min-w-8 rounded-full px-2 text-xs font-medium",
                                    isSelected
                                      ? "bg-brand-default text-brand"
                                      : "border-default bg-default text-default border",
                                    customClassNames?.weekdaysInput?.button
                                  )}>
                                  {shortName}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        {recurringEventState.byweekday?.length === 0 && (
                          <p className="text-error mt-2 text-sm">{t("recurring_select_at_least_one_day")}</p>
                        )}
                      </div>
                    )}
                    <div
                      className={classNames(
                        "mt-4 flex items-center",
                        customClassNames?.maxEventsInput?.container
                      )}>
                      <p
                        className={classNames(
                          "text-emphasis ltr:mr-2 rtl:ml-2",
                          customClassNames?.maxEventsInput?.labelText
                        )}>
                        {t("for_a_maximum_of")}
                      </p>
                      <TextField
                        disabled={recurringLocked.disabled}
                        type="number"
                        min="1"
                        max="24"
                        defaultValue={recurringEventState.count}
                        className={classNames("mb-0", customClassNames?.maxEventsInput?.countInput)}
                        onChange={(event) => {
                          const newVal = {
                            ...recurringEventState,
                            count: parseInt(event?.target.value, 10),
                          };
                          formMethods.setValue("recurringEvent", newVal, { shouldDirty: true });
                          setRecurringEventState(newVal);
                        }}
                      />
                      <p
                        className={classNames(
                          "text-emphasis ltr:ml-2 rtl:mr-2",
                          customClassNames?.maxEventsInput?.suffixText
                        )}>
                        {t("events", {
                          count: recurringEventState.count,
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </SettingsToggle>
          </>
        )}
      </div>
    </div>
  );
}
