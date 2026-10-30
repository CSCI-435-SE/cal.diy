import { Frequency, type recurringEventType } from "@calcom/prisma/zod-utils";
import type { RecurringEvent } from "@calcom/types/Calendar";
import type { z } from "zod";

type RecurringEventRule = NonNullable<z.infer<typeof recurringEventType>>;
type StoredWeekdayFields = Pick<RecurringEvent, "byweekday" | "tzid" | "wkst">;

/**
 * Decides which recurring rule to save when an event type is updated.
 * - Only weekly rules keep selected days: the form keeps them while the host switches to
 *   "month" or "year" so they come back on switching back, but they must not be saved, because
 *   rrule reads BYDAY on a monthly rule as "every one of those weekdays in the month".
 * - A weekly update without days (e.g. from API v2, whose recurrence input has no days) keeps
 *   the days, time zone and week start already saved, instead of silently erasing them.
 */
export function mergeRecurringEventUpdate(
  input: RecurringEventRule,
  stored: StoredWeekdayFields | null
): RecurringEventRule {
  if (input.freq !== Frequency.WEEKLY) {
    const { byweekday: _byweekday, wkst: _wkst, ...withoutWeekdays } = input;
    return withoutWeekdays;
  }

  if (input.byweekday !== undefined || !stored?.byweekday) return input;

  return {
    ...input,
    byweekday: stored.byweekday,
    tzid: input.tzid ?? stored.tzid,
    wkst: input.wkst ?? stored.wkst,
  };
}
