import {
  hoursAndMinutesToMinutes,
  minutesToHoursAndMinutes,
  parseDurationPart,
} from "@calcom/features/eventtypes/lib/duration";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { TextField } from "@calcom/ui/components/form";
import { useState } from "react";

type DurationDraft = {
  hours: string;
  minutes: string;
};

export type DurationInputProps = {
  /** Total duration in minutes — the shape the form and the API both use. */
  value: number | undefined;
  onChange: (totalMinutes: number) => void;
  onBlur?: () => void;
  /** Drives which field validation errors render against; the form stores minutes under this key. */
  name?: string;
  label?: string;
  disabled?: boolean;
  required?: boolean;
  containerClassName?: string;
  labelClassName?: string;
  className?: string;
  dataTestId?: string;
};

/**
 * Two boxes over one stored value (issue #4). The hours box is left blank rather than showing a
 * literal "0" so a short event does not gain visual noise, and the split is only re-derived once
 * the control is blurred — otherwise typing "90" into minutes would rewrite the field under the
 * cursor as soon as it crossed the hour.
 */
export const DurationInput = ({
  value,
  onChange,
  onBlur,
  name = "length",
  label,
  disabled,
  required,
  containerClassName,
  labelClassName,
  className,
  dataTestId = "duration",
}: DurationInputProps) => {
  const { t } = useLocale();
  const [draft, setDraft] = useState<DurationDraft | null>(null);

  const split = minutesToHoursAndMinutes(value ?? 0);
  const shown = draft ?? {
    hours: split.hours === 0 ? "" : String(split.hours),
    minutes: String(split.minutes),
  };

  const update = (next: DurationDraft) => {
    setDraft(next);
    onChange(
      hoursAndMinutesToMinutes({
        hours: parseDurationPart(next.hours),
        minutes: parseDurationPart(next.minutes),
      })
    );
  };

  const handleBlur = () => {
    setDraft(null);
    onBlur?.();
  };

  return (
    <div className={classNames("w-full", containerClassName)}>
      <label
        htmlFor={`${name}-hours`}
        className={classNames("mb-2 block font-medium text-default text-sm leading-none", labelClassName)}>
        {label ?? t("duration")}
      </label>
      <div className="flex items-start gap-2">
        <TextField
          id={`${name}-hours`}
          type="number"
          min={0}
          noLabel
          disabled={disabled}
          containerClassName="w-full"
          className={className}
          data-testid={`${dataTestId}-hours`}
          aria-label={t("hours")}
          placeholder="0"
          value={shown.hours}
          onChange={(event) => update({ ...shown, hours: event.target.value })}
          onBlur={handleBlur}
          addOnSuffix={t("hours").toLowerCase()}
        />
        <TextField
          id={`${name}-minutes`}
          type="number"
          min={0}
          noLabel
          name={name}
          required={required}
          disabled={disabled}
          containerClassName="w-full"
          className={className}
          data-testid={dataTestId}
          aria-label={t("minutes")}
          placeholder="15"
          value={shown.minutes}
          onChange={(event) => update({ ...shown, minutes: event.target.value })}
          onBlur={handleBlur}
          addOnSuffix={t("minutes").toLowerCase()}
        />
      </div>
    </div>
  );
};
