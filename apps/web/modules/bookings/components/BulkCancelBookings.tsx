"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent, DialogFooter } from "@calcom/ui/components/dialog";
import { Label, TextArea } from "@calcom/ui/components/form";
import { useState } from "react";
import { DataTableSelectionBar } from "../../data-table/components/DataTableSelectionBar";
import { type BulkCancelResult, cancelBookingByUid } from "../lib/bulkCancel";

type BulkCancelBookingsProps = {
  selectedBookings: { uid: string; title: string }[];
  canSelectMore: boolean;
  userEmail?: string;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onCancelled: (uids: string[]) => void;
};

export function BulkCancelBookings({
  selectedBookings,
  canSelectMore,
  userEmail,
  onSelectAll,
  onClearSelection,
  onCancelled,
}: BulkCancelBookingsProps) {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<BulkCancelResult[]>([]);

  if (selectedBookings.length === 0 && !isOpen) return null;

  const titleByUid = new Map(selectedBookings.map((booking) => [booking.uid, booking.title]));
  const failures = results.filter((result): result is Extract<BulkCancelResult, { ok: false }> => !result.ok);

  const submit = async (uids: string[]) => {
    setIsRunning(true);
    const batch: BulkCancelResult[] = [];
    const cancellationReason = reason.trim();
    // Sequential, per booking, so each attendee gets their own email and one failure never stops the rest
    for (const uid of uids) {
      batch.push({ uid, ...(await cancelBookingByUid({ uid, cancellationReason, cancelledBy: userEmail })) });
    }
    setResults(batch);
    onCancelled(batch.filter((result) => result.ok).map((result) => result.uid));
    setIsRunning(false);
    await utils.viewer.bookings.invalidate();
  };

  const onOpenChange = (open: boolean) => {
    // Closing mid-batch would hide progress while requests are still being sent
    if (isRunning) return;
    setIsOpen(open);
    if (!open) {
      setResults([]);
      setReason("");
    }
  };

  return (
    <>
      {selectedBookings.length > 0 && (
        <DataTableSelectionBar.Root className="bottom-16! justify-center md:w-max">
          <p className="shrink-0 px-2 text-brand-subtle text-sm">
            {t("number_selected", { count: selectedBookings.length })}
          </p>
          {canSelectMore && (
            <DataTableSelectionBar.Button color="secondary" icon="check" onClick={onSelectAll}>
              {t("bulk_cancel_select_page")}
            </DataTableSelectionBar.Button>
          )}
          <DataTableSelectionBar.Button color="secondary" icon="x" onClick={onClearSelection}>
            {t("bulk_cancel_clear_selection")}
          </DataTableSelectionBar.Button>
          <DataTableSelectionBar.Button
            color="destructive"
            icon="ban"
            data-testid="bulk-cancel-open"
            onClick={() => onOpenChange(true)}>
            {t("bulk_cancel_selected")}
          </DataTableSelectionBar.Button>
        </DataTableSelectionBar.Root>
      )}
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent
          enableOverflow
          title={t("bulk_cancel_title", { count: selectedBookings.length })}
          description={t("bulk_cancel_description")}>
          {results.length > 0 && (
            <div role="status" className="mb-4 text-sm">
              <p className="font-medium text-emphasis">
                {t("bulk_cancel_summary", {
                  succeeded: results.length - failures.length,
                  failed: failures.length,
                })}
              </p>
              <ul className="mt-2 list-disc pl-5 text-error">
                {failures.map((failure) => (
                  <li key={failure.uid}>
                    {titleByUid.get(failure.uid) ?? failure.uid}:{" "}
                    {failure.message || t("error_with_status_code_occured", { status: failure.status })}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <ul className="mb-4 list-disc pl-5 text-default text-sm">
            {selectedBookings.map((booking) => (
              <li key={booking.uid}>{booking.title}</li>
            ))}
          </ul>
          <Label htmlFor="bulk-cancel-reason">{t("cancellation_reason")}</Label>
          <TextArea
            id="bulk-cancel-reason"
            data-testid="bulk-cancel-reason"
            rows={3}
            value={reason}
            placeholder={t("cancellation_reason_placeholder")}
            onChange={(event) => setReason(event.target.value)}
          />
          <DialogFooter>
            <Button color="secondary" disabled={isRunning} onClick={() => onOpenChange(false)}>
              {t("nevermind")}
            </Button>
            <Button
              color="destructive"
              data-testid="bulk-cancel-confirm"
              loading={isRunning}
              disabled={!reason.trim() || isRunning || selectedBookings.length === 0}
              onClick={() => submit(selectedBookings.map((booking) => booking.uid))}>
              {failures.length > 0 ? t("bulk_cancel_retry_failed") : t("bulk_cancel_confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
