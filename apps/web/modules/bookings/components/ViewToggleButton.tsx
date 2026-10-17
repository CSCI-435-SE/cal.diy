"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import useMediaQuery from "@calcom/lib/hooks/useMediaQuery";
import { ToggleGroup } from "@calcom/ui/components/form";
import { CalendarDaysIcon, CalendarIcon, MenuIcon } from "@coss/ui/icons";
import { useEffect } from "react";
import { isBookingView, useBookingsView } from "../hooks/useBookingsView";

type ViewToggleButtonProps = {
  bookingsV3Enabled: boolean;
};

export function ViewToggleButton({ bookingsV3Enabled }: ViewToggleButtonProps) {
  const { t } = useLocale();
  const [view, setView] = useBookingsView({ bookingsV3Enabled });
  const isMobile = useMediaQuery("(max-width: 768px)");

  useEffect(() => {
    // Force list view on mobile
    if (isMobile && view !== "list") {
      setView("list");
    }
  }, [isMobile, view, setView]);

  if (isMobile) {
    return null;
  }

  return (
    <div className="hidden sm:block">
      <ToggleGroup
        aria-label={t("bookings_view")}
        value={view}
        onValueChange={(value) => {
          if (!isBookingView(value)) return;
          setView(value);
        }}
        options={[
          {
            value: "list",
            label: t("bookings_view_list"),
            tooltip: t("list_view"),
            iconLeft: <MenuIcon className="h-4 w-4" />,
          },
          {
            value: "calendar",
            label: t("bookings_view_week"),
            tooltip: t("week_view"),
            iconLeft: <CalendarIcon className="h-4 w-4" />,
          },
          {
            value: "month",
            label: t("bookings_view_month"),
            tooltip: t("month_view"),
            iconLeft: <CalendarDaysIcon className="h-4 w-4" />,
          },
        ]}
      />
    </div>
  );
}
