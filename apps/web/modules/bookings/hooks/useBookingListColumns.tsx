import { ColumnFilterType } from "@calcom/features/data-table";
import { isSeparatorRow } from "@calcom/features/data-table/lib/separator";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import { Checkbox } from "@calcom/ui/components/form";
import BookingListItem from "@calcom/web/components/booking/BookingListItem";
import { createColumnHelper } from "@tanstack/react-table";
import { useMemo } from "react";
import type { BookingListingStatus, RowData } from "../types";
import type { BookingRowSelection } from "./useBulkCancelSelection";

export function useBookingListColumns({
  user,
  status,
  canReadOthersBookings,
  bookingsV3Enabled,
  handleBookingClick,
  selection,
}: {
  user: ReturnType<typeof useMeQuery>["data"];
  status: BookingListingStatus;
  canReadOthersBookings: boolean;
  bookingsV3Enabled: boolean;
  handleBookingClick: (bookingUid: string) => void;
  selection?: BookingRowSelection;
}) {
  const { t } = useLocale();

  return useMemo(() => {
    const columnHelper = createColumnHelper<RowData>();

    return [
      columnHelper.accessor((row) => !isSeparatorRow(row) && row.booking.eventType.id, {
        id: "eventTypeId",
        header: t("event_type"),
        enableColumnFilter: true,
        enableSorting: false,
        cell: () => null,
        meta: {
          filter: {
            type: ColumnFilterType.MULTI_SELECT,
          },
        },
      }),
      columnHelper.accessor((row) => !isSeparatorRow(row) && row.booking.eventType.team?.id, {
        id: "teamId",
        header: t("team"),
        enableColumnFilter: true,
        enableSorting: false,
        cell: () => null,
        meta: {
          filter: {
            type: ColumnFilterType.MULTI_SELECT,
          },
        },
      }),
      columnHelper.accessor((row) => !isSeparatorRow(row) && row.booking.user?.id, {
        id: "userId",
        header: t("member"),
        enableColumnFilter: true,
        enableSorting: false,
        cell: () => null,
        meta: {
          filter: {
            type: ColumnFilterType.MULTI_SELECT,
          },
        },
      }),
      columnHelper.accessor((row) => row, {
        id: "attendeeName",
        header: t("attendee_name"),
        enableColumnFilter: true,
        enableSorting: false,
        cell: () => null,
        meta: {
          filter: {
            type: ColumnFilterType.TEXT,
          },
        },
      }),
      columnHelper.accessor((row) => row, {
        id: "attendeeEmail",
        header: t("attendee_email_variable"),
        enableColumnFilter: true,
        enableSorting: false,
        cell: () => null,
        meta: {
          filter: {
            type: ColumnFilterType.TEXT,
          },
        },
      }),
      columnHelper.accessor((row) => row, {
        id: "dateRange",
        header: t("date_range"),
        enableColumnFilter: true,
        enableSorting: false,
        cell: () => null,
        meta: {
          filter: {
            type: ColumnFilterType.DATE_RANGE,
            dateRangeOptions: {
              range: status === "past" ? "past" : status === "cancelled" ? "any" : "future", // upcoming, unconfirmed, recurring are all future-only
            },
          },
        },
      }),
      columnHelper.accessor((row) => !isSeparatorRow(row) && row.booking.uid, {
        id: "bookingUid",
        header: t("booking_uid"),
        enableColumnFilter: true,
        enableSorting: false,
        cell: () => null,
        meta: {
          filter: {
            type: ColumnFilterType.TEXT,
            textOptions: {
              allowedOperators: ["equals"],
            },
          },
        },
      }),
      columnHelper.display({
        id: "customView",
        cell: (props) => {
          const row = props.row.original;

          // Separator rows are handled automatically by DataTable
          if (isSeparatorRow(row)) {
            return null;
          }

          const { booking, recurringInfo, isToday } = row;
          const item = (
            <BookingListItem
              key={booking.id}
              isToday={isToday}
              loggedInUser={{
                userId: user?.id,
                userTimeZone: user?.timeZone,
                userTimeFormat: user?.timeFormat,
                userEmail: user?.email,
              }}
              listingStatus={status}
              recurringInfo={recurringInfo}
              {...(bookingsV3Enabled && { onClick: () => handleBookingClick(booking.uid) })}
              {...booking}
            />
          );
          if (!selection) return item;

          const isSelected = selection.isSelected(booking.uid);
          return (
            <div className="flex w-full items-center">
              {/* Selecting must never count as a row click, which would open the booking details */}
              <div className="w-10 shrink-0 pl-4" onClick={(event) => event.stopPropagation()}>
                {selection.isSelectable(booking.uid) && (
                  <Checkbox
                    checked={isSelected}
                    disabled={!isSelected && !selection.canSelectMore}
                    onCheckedChange={() => selection.onToggle(booking.uid)}
                    aria-label={t("bulk_cancel_select_booking", { title: booking.title })}
                    data-testid={`bulk-cancel-select-${booking.uid}`}
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">{item}</div>
            </div>
          );
        },
      }),
    ];
  }, [user, status, t, bookingsV3Enabled, handleBookingClick, selection]);
}
