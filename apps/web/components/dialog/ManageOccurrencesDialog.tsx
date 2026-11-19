import dayjs from "@calcom/dayjs";
import { Dialog } from "@calcom/features/components/controlled-dialog";
import { formatTime } from "@calcom/lib/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { BookingStatus } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { DialogClose, DialogContent, DialogFooter } from "@calcom/ui/components/dialog";
import { AcceptBookingButton } from "../booking/AcceptBookingButton";
import { RejectBookingButton } from "../booking/RejectBookingButton";

interface ManageOccurrencesDialogProps {
  isOpenDialog: boolean;
  setIsOpenDialog: (open: boolean) => void;
  bookingId: number;
  userTimeZone?: string;
  userTimeFormat?: number | null;
}

const statusBadge: Record<BookingStatus, { label: string; variant: "orange" | "green" | "red" | "gray" }> = {
  [BookingStatus.PENDING]: { label: "unconfirmed", variant: "orange" },
  [BookingStatus.ACCEPTED]: { label: "confirmed", variant: "green" },
  [BookingStatus.REJECTED]: { label: "rejected", variant: "red" },
  [BookingStatus.CANCELLED]: { label: "cancelled", variant: "gray" },
  [BookingStatus.AWAITING_HOST]: { label: "pending", variant: "gray" },
};

export function ManageOccurrencesDialog({
  isOpenDialog,
  setIsOpenDialog,
  bookingId,
  userTimeZone,
  userTimeFormat,
}: ManageOccurrencesDialogProps) {
  const {
    t,
    i18n: { language },
  } = useLocale();

  const { data: occurrences, isPending } = trpc.viewer.bookings.getRecurringOccurrences.useQuery(
    { bookingId },
    { enabled: isOpenDialog }
  );

  const now = new Date();

  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent
        title={t("manage_occurrences")}
        description={t("manage_occurrences_description")}
        enableOverflow
        data-testid="manage-occurrences-dialog">
        <div className="max-h-[50vh] min-h-0 overflow-y-auto">
          {isPending ? (
            <p className="text-subtle text-sm">{t("loading")}</p>
          ) : (
            <ul className="divide-subtle divide-y">
              {occurrences?.map((occurrence) => {
                const badge = statusBadge[occurrence.status];
                const canAct =
                  occurrence.status === BookingStatus.PENDING && new Date(occurrence.endTime) >= now;
                return (
                  <li
                    key={occurrence.id}
                    data-testid="occurrence-row"
                    className="flex items-center justify-between gap-2 py-3">
                    <div className="text-sm">
                      <div className="text-emphasis">
                        {dayjs(occurrence.startTime)
                          .tz(userTimeZone)
                          .locale(language)
                          .format("ddd, D MMM YYYY")}
                      </div>
                      <div className="text-subtle">
                        {formatTime(occurrence.startTime, userTimeFormat, userTimeZone)} -{" "}
                        {formatTime(occurrence.endTime, userTimeFormat, userTimeZone)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={badge.variant}>{t(badge.label)}</Badge>
                      {canAct && (
                        <>
                          <RejectBookingButton
                            bookingId={occurrence.id}
                            bookingUid={occurrence.uid}
                            size="sm"
                          />
                          <AcceptBookingButton
                            bookingId={occurrence.id}
                            bookingUid={occurrence.uid}
                            size="sm"
                          />
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <DialogFooter noSticky>
          <DialogClose color="secondary" />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
