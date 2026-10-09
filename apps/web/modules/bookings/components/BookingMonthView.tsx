"use client";

import dayjs from "@calcom/dayjs";
import { useTimePreferences } from "@calcom/features/bookings/lib/timePreferences";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useGetTheme } from "@calcom/lib/hooks/useTheme";
import { TimeFormat } from "@calcom/lib/timeFormat";
import classNames from "@calcom/ui/classNames";
import { useMemo } from "react";
import { getMonthGrid, groupBookingsByDay } from "../lib/monthUtils";
import { useBookingDetailsSheetStore } from "../store/bookingDetailsSheetStore";
import type { BookingOutput } from "../types";

type BookingMonthViewProps = {
  bookings: BookingOutput[];
  currentMonth: dayjs.Dayjs;
  userWeekStart: number;
  isLoading: boolean;
};

// Grid days are plain calendar dates, so they are formatted in UTC to avoid shifting by the viewer's offset
const toUtcDate = (day: string) => new Date(`${day}T00:00:00Z`);

export function BookingMonthView({
  bookings,
  currentMonth,
  userWeekStart,
  isLoading,
}: BookingMonthViewProps) {
  const { t, i18n } = useLocale();
  const { timezone, timeFormat } = useTimePreferences();
  const { resolvedTheme, forcedTheme } = useGetTheme();
  const setSelectedBookingUid = useBookingDetailsSheetStore((state) => state.setSelectedBookingUid);
  const selectedBookingUid = useBookingDetailsSheetStore((state) => state.selectedBookingUid);

  const weeks = useMemo(() => getMonthGrid(currentMonth, userWeekStart), [currentMonth, userWeekStart]);
  const bookingsByDay = useMemo(() => groupBookingsByDay(bookings, timezone), [bookings, timezone]);
  const monthPrefix = currentMonth.format("YYYY-MM");
  const todayKey = dayjs().tz(timezone).format("YYYY-MM-DD");
  const colorKey = !forcedTheme && resolvedTheme === "dark" ? "darkEventTypeColor" : "lightEventTypeColor";
  const isEmpty = !weeks.some((week) => week.some((day) => bookingsByDay.has(day)));

  const weekdayFormatter = new Intl.DateTimeFormat(i18n.language, { weekday: "short", timeZone: "UTC" });
  const dayLabelFormatter = new Intl.DateTimeFormat(i18n.language, { dateStyle: "full", timeZone: "UTC" });
  const timeFormatter = new Intl.DateTimeFormat(i18n.language, {
    hour: "numeric",
    minute: "2-digit",
    hour12: timeFormat === TimeFormat.TWELVE_HOUR,
    timeZone: timezone,
  });

  return (
    <div className="border-subtle overflow-hidden rounded-2xl border">
      {(isLoading || isEmpty) && (
        <p className="border-subtle text-subtle border-b px-4 py-2 text-sm" role="status">
          {isLoading ? t("loading") : t("no_bookings_this_month")}
        </p>
      )}
      <div role="grid" className="grid grid-cols-7">
        <div role="row" className="contents">
          {weeks[0].map((day) => (
            <div
              key={day}
              role="columnheader"
              className="border-subtle text-subtle border-b p-2 text-center text-xs">
              {weekdayFormatter.format(toUtcDate(day))}
            </div>
          ))}
        </div>
        {weeks.map((week) => (
          <div key={week[0]} role="row" className="contents">
            {week.map((day) => (
              <div
                key={day}
                role="gridcell"
                aria-label={dayLabelFormatter.format(toUtcDate(day))}
                data-testid={`month-day-${day}`}
                className={classNames(
                  "border-subtle h-32 overflow-y-auto border-r border-b p-1 [&:nth-child(7n)]:border-r-0",
                  !day.startsWith(monthPrefix) && "bg-muted text-muted"
                )}>
                <span
                  className={classNames(
                    "mb-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs",
                    day === todayKey && "bg-brand-default font-semibold text-brand"
                  )}>
                  {Number(day.slice(8))}
                </span>
                {bookingsByDay.get(day)?.map((booking) => {
                  const color = booking.eventType?.eventTypeColor?.[colorKey];
                  const startLabel = timeFormatter.format(new Date(booking.startTime));
                  return (
                    <button
                      key={booking.uid}
                      type="button"
                      onClick={() => setSelectedBookingUid(booking.uid)}
                      data-testid={`month-booking-${booking.uid}`}
                      style={color ? { borderLeftColor: color } : undefined}
                      className={classNames(
                        "flex w-full gap-1 truncate rounded-r border-l-2 border-l-brand-default px-1 py-0.5 text-left text-xs hover:bg-subtle",
                        booking.status === "PENDING" && "opacity-70",
                        selectedBookingUid === booking.uid && "bg-emphasis"
                      )}>
                      <span className="shrink-0 text-subtle">{startLabel}</span>
                      <span className="truncate text-emphasis">{booking.title}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
