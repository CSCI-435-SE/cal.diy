import { useLocale } from "@calcom/lib/hooks/useLocale";
import { ToggleGroup } from "@calcom/ui/components/form";
import type { AvailabilityView } from "../hooks/useAvailabilityView";
import { isAvailabilityView } from "../hooks/useAvailabilityView";

type AvailabilityViewToggleProps = {
  value: AvailabilityView;
  onValueChange: (view: AvailabilityView) => void;
};

export function AvailabilityViewToggle({ value, onValueChange }: AvailabilityViewToggleProps) {
  const { t } = useLocale();

  return (
    <ToggleGroup
      aria-label={t("availability_input_mode")}
      value={value}
      onValueChange={(nextView) => {
        if (isAvailabilityView(nextView)) onValueChange(nextView);
      }}
      options={[
        { value: "list", label: t("text"), dataTestId: "availability-view-text" },
        { value: "grid", label: t("visual"), dataTestId: "availability-view-visual" },
      ]}
    />
  );
}
