import { useLocale } from "@calcom/lib/hooks/useLocale";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo } from "react";

export function useBookingStatusTab() {
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const tabOptions = useMemo(() => {
    const queryString = searchParams?.toString() || "";

    const baseTabConfigs = [
      {
        value: "upcoming",
        label: "upcoming",
        path: "/bookings/upcoming",
        dataTestId: "upcoming",
      },
      {
        value: "unconfirmed",
        label: "unconfirmed",
        path: "/bookings/unconfirmed",
        dataTestId: "unconfirmed",
      },
      {
        value: "recurring",
        label: "recurring",
        path: "/bookings/recurring",
        dataTestId: "recurring",
      },
      {
        value: "past",
        label: "past",
        path: "/bookings/past",
        dataTestId: "past",
      },
      {
        value: "cancelled",
        label: "cancelled",
        path: "/bookings/cancelled",
        dataTestId: "cancelled",
      },
    ];

    const bookingTabs = baseTabConfigs.map((tabConfig) => ({
      value: tabConfig.value,
      label: t(tabConfig.label),
      dataTestId: tabConfig.dataTestId,
      href: queryString ? `${tabConfig.path}?${queryString}` : tabConfig.path,
    }));

    // Booking list filters don't apply to People, so its link never carries the query string
    const peopleTab = { value: "people", label: t("people"), dataTestId: "people", href: "/bookings/people" };

    return [...bookingTabs, peopleTab];
  }, [searchParams, t]);

  const currentTab = useMemo(() => {
    const pathMatch = pathname?.match(/\/bookings\/(\w+)/);
    return pathMatch?.[1] || "upcoming";
  }, [pathname]);

  return {
    currentTab,
    tabOptions,
  };
}
