import dayjs from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { weekdayNames } from "@calcom/lib/weekday";
import cn from "@calcom/ui/classNames";
import { memo, useMemo, useRef } from "react";
import type { WeeklyGridSelectionChange } from "../hooks/useWeeklyGridDrag";
import { useWeeklyGridDrag } from "../hooks/useWeeklyGridDrag";
import { AVAILABILITY_SLOT_INTERVAL_MINUTES } from "../lib/constants";
import { getSlotsPerDay, resolveSlotInterval } from "../lib/weekly-grid";

const DAYS_IN_WEEK = 7;
const GRID_COLUMNS = "grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]";

type WeeklyAvailabilityGridProps = {
  /** 7 × slotsPerDay matrix, Sunday-indexed, where `true` marks an available slot */
  value: boolean[][];
  weekStart?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  timeFormat: number | null;
  intervalMinutes?: number;
  className?: string;
  /** Makes the grid editable by drag; without it the grid is read-only */
  onSelectionChange?: (change: WeeklyGridSelectionChange) => void;
};

function WeeklyAvailabilityGridComponent({
  value,
  weekStart = 0,
  timeFormat,
  intervalMinutes = AVAILABILITY_SLOT_INTERVAL_MINUTES,
  className,
  onSelectionChange,
}: WeeklyAvailabilityGridProps) {
  const { t, i18n } = useLocale();
  const interval = resolveSlotInterval(intervalMinutes);
  const slotsPerDay = getSlotsPerDay(interval);
  const slotsPerHour = 60 / interval;
  const isEditable = Boolean(onSelectionChange);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const rowsRef = useRef<HTMLDivElement>(null);
  const { getDisplaySlots, handlers } = useWeeklyGridDrag({
    value,
    intervalMinutes: interval,
    onSelectionChange,
    rowsRef,
    scrollContainerRef,
  });

  const shortDayNames = useMemo(
    () => weekdayNames(i18n.language, weekStart, "short"),
    [i18n.language, weekStart]
  );
  const longDayNames = useMemo(() => weekdayNames(i18n.language, 0, "long"), [i18n.language]);

  // Same format rule as the time range dropdowns so both views read identically
  const slotLabels = useMemo(() => {
    const format = timeFormat === 12 ? "h:mma" : "HH:mm";
    const startOfDay = dayjs.utc().startOf("day");
    return Array.from({ length: slotsPerDay }, (_, slot) =>
      startOfDay.add(slot * interval, "minute").format(format)
    );
  }, [timeFormat, slotsPerDay, interval]);

  const displayedDays = Array.from(
    { length: DAYS_IN_WEEK },
    (_, column) => (column + weekStart) % DAYS_IN_WEEK
  );
  const displaySlotsByDay = displayedDays.map((day) => getDisplaySlots(day));

  return (
    <div
      ref={scrollContainerRef}
      role="grid"
      aria-label={t("weekly_availability_grid")}
      aria-readonly={!isEditable}
      className={cn(
        "max-h-[600px] overflow-y-auto [--weekly-grid-hour-height:4rem] md:[--weekly-grid-hour-height:3rem]",
        isEditable && "select-none",
        className
      )}>
      <div role="row" className={cn(GRID_COLUMNS, "sticky top-0 z-10 border-subtle border-b bg-default")}>
        <div role="columnheader" aria-hidden="true" />
        {displayedDays.map((day, column) => (
          <div
            key={day}
            role="columnheader"
            aria-label={longDayNames[day]}
            className="truncate py-2 text-center font-medium text-default text-xs sm:text-sm">
            {shortDayNames[column]}
          </div>
        ))}
      </div>
      <div ref={rowsRef} role="rowgroup" {...(isEditable ? handlers : {})}>
        {slotLabels.map((label, slot) => {
          const isHourStart = slot % slotsPerHour === 0;
          return (
            <div
              key={label}
              role="row"
              className={GRID_COLUMNS}
              style={{ height: `calc(var(--weekly-grid-hour-height) / ${slotsPerHour})` }}>
              <div role="rowheader" className="pe-2 text-right text-muted text-xs leading-none">
                {isHourStart ? label : null}
              </div>
              {displayedDays.map((day, column) => {
                const isSelected = displaySlotsByDay[column][slot] ?? false;
                return (
                  <div
                    key={day}
                    role="gridcell"
                    data-testid={`weekly-grid-cell-${day}-${slot}`}
                    data-day={day}
                    data-slot={slot}
                    data-selected={isSelected}
                    aria-label={t("availability_grid_cell_label", {
                      day: longDayNames[day],
                      time: label,
                      status: t(isSelected ? "available" : "unavailable"),
                    })}
                    className={cn(
                      "border-subtle border-t border-l",
                      isHourStart ? "border-t-subtle" : "border-t-muted [border-top-style:dashed]",
                      isSelected ? "bg-brand-default" : "bg-default",
                      // Lets a finger drag select instead of scrolling; labels and header still scroll
                      isEditable && "cursor-pointer touch-none"
                    )}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const WeeklyAvailabilityGrid = memo(WeeklyAvailabilityGridComponent);

export default WeeklyAvailabilityGrid;
