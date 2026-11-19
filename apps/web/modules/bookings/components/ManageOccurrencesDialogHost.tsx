import { ManageOccurrencesDialog } from "@calcom/web/components/dialog/ManageOccurrencesDialog";
import { useEffect } from "react";

import { useManageOccurrencesStore } from "../store/manageOccurrencesStore";

export function ManageOccurrencesDialogHost({
  userTimeZone,
  userTimeFormat,
}: {
  userTimeZone?: string;
  userTimeFormat?: number | null;
}) {
  const bookingId = useManageOccurrencesStore((state) => state.bookingId);
  const setBookingId = useManageOccurrencesStore((state) => state.setBookingId);

  // The store is global, so close the dialog when the bookings list goes away.
  useEffect(() => () => setBookingId(null), [setBookingId]);

  if (bookingId === null) return null;

  return (
    <ManageOccurrencesDialog
      isOpenDialog
      setIsOpenDialog={(open) => {
        if (!open) setBookingId(null);
      }}
      bookingId={bookingId}
      userTimeZone={userTimeZone}
      userTimeFormat={userTimeFormat}
    />
  );
}
