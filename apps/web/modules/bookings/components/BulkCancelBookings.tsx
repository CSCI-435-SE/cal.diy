"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent, DialogFooter } from "@calcom/ui/components/dialog";
import { Label, TextArea } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
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

export function BulkCancelBookings(props: BulkCancelBookingsProps) {
  const { selectedBookings, userEmail, onCancelled } = props;
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  // Titles are kept with each result because failed bookings may leave the selection after the refetch
  const [results, setResults] = useState<(BulkCancelResult & { title: string })[]>([]);

  if (selectedBookings.length === 0 && !isOpen) return null;

  const failures = results.flatMap((result) => (result.ok ? [] : [result]));
  const summary = t("bulk_cancel_summary", {
    succeeded: results.length - failures.length,
    failed: failures.length,
  });

  const submit = async () => {
    setIsRunning(true);
    const batch: (BulkCancelResult & { title: string })[] = [];
    const cancellationReason = reason.trim();
    // Sequential, per booking, so each attendee gets their own email and one failure never stops the rest
    for (const { uid, title } of selectedBookings) {
      const outcome = await cancelBookingByUid({ uid, cancellationReason, cancelledBy: userEmail });
      batch.push({ uid, title, ...outcome });
    }
    const succeeded = batch.filter((result) => result.ok).map((result) => result.uid);
    onCancelled(succeeded);
    setIsRunning(false);
    if (succeeded.length === batch.length) {
      showToast(t("bulk_cancel_summary", { succeeded: succeeded.length, failed: 0 }), "success");
      closeDialog();
    } else {
      setResults(batch);
    }
    await utils.viewer.bookings.invalidate();
  };

  const closeDialog = () => {
    setIsOpen(false);
    setResults([]);
    setReason("");
  };

  return (
    <>
      {selectedBookings.length > 0 && (
        <DataTableSelectionBar.Root className="bottom-16! justify-center md:w-max">
          <p className="shrink-0 px-2 text-brand-subtle text-sm">
            {t("number_selected", { count: selectedBookings.length })}
          </p>
          {props.canSelectMore && (
            <DataTableSelectionBar.Button color="secondary" icon="check" onClick={props.onSelectAll}>
              {t("bulk_cancel_select_page")}
            </DataTableSelectionBar.Button>
          )}
          <DataTableSelectionBar.Button color="secondary" icon="x" onClick={props.onClearSelection}>
            {t("bulk_cancel_clear_selection")}
          </DataTableSelectionBar.Button>
          <DataTableSelectionBar.Button
            color="destructive"
            icon="ban"
            data-testid="bulk-cancel-open"
            onClick={() => setIsOpen(true)}>
            {t("bulk_cancel_selected")}
          </DataTableSelectionBar.Button>
        </DataTableSelectionBar.Root>
      )}
      {/* Closing mid-batch would hide progress while requests are still being sent */}
      <Dialog open={isOpen} onOpenChange={(open) => !open && !isRunning && closeDialog()}>
        <DialogContent
          enableOverflow
          title={results.length > 0 ? summary : t("bulk_cancel_title", { count: selectedBookings.length })}
          description={t("bulk_cancel_description")}>
          <ul className="mb-4 list-disc pl-5 text-default text-sm" role="status">
            {results.length > 0
              ? failures.map((failure) => (
                  <li key={failure.uid} className="text-error">
                    {failure.title}:{" "}
                    {failure.message || t("error_with_status_code_occured", { status: failure.status })}
                  </li>
                ))
              : selectedBookings.map((booking) => <li key={booking.uid}>{booking.title}</li>)}
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
            <Button color="secondary" disabled={isRunning} onClick={closeDialog}>
              {t("nevermind")}
            </Button>
            {selectedBookings.length > 0 && (
              <Button
                color="destructive"
                data-testid="bulk-cancel-confirm"
                loading={isRunning}
                disabled={!reason.trim() || isRunning}
                onClick={submit}>
                {failures.length > 0 ? t("bulk_cancel_retry_failed") : t("bulk_cancel_confirm")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
