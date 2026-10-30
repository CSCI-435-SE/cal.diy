import dayjs from "@calcom/dayjs";
import { useBookerStoreContext } from "@calcom/features/bookings/Booker/BookerStoreProvider";
import { useBookerTime } from "@calcom/features/bookings/Booker/hooks/useBookerTime";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

/** Booked (waitlistable) start times of the current event, grouped by YYYY-MM-DD in the booker's timezone. */
export const useWaitlistBookedTimes = (): Record<string, string[]> => {
  const eventId = useBookerStoreContext((state) => state.eventId);
  const month = useBookerStoreContext((state) => state.month);
  const { timezone } = useBookerTime();

  const monthStart = dayjs.tz(`${month ?? dayjs().format("YYYY-MM")}-01`, timezone);
  // Padded so leading/trailing days shown from adjacent months and multi-day views are covered
  const from = monthStart.subtract(7, "day").toISOString();
  const to = monthStart.add(1, "month").add(14, "day").toISOString();

  const { data } = useQuery({
    queryKey: ["waitlist-booked-times", eventId, from, to],
    enabled: !!eventId,
    queryFn: async () => {
      const params = new URLSearchParams({ eventTypeId: String(eventId), from, to });
      const res = await fetch(`/api/waitlist/booked-times?${params.toString()}`);
      if (!res.ok) return [];
      const body: { times: string[] } = await res.json();
      return body.times;
    },
  });

  return useMemo(() => {
    const byDay: Record<string, string[]> = {};
    for (const time of data ?? []) {
      const day = dayjs(time).tz(timezone).format("YYYY-MM-DD");
      (byDay[day] ??= []).push(time);
    }
    return byDay;
  }, [data, timezone]);
};
