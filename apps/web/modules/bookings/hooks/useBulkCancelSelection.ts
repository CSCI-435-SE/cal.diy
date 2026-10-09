import { useEffect, useMemo, useState } from "react";
import { BULK_CANCEL_LIMIT, isBulkCancellable } from "../lib/bulkCancel";
import type { BookingOutput } from "../types";

export type BookingRowSelection = {
  isSelectable: (uid: string) => boolean;
  isSelected: (uid: string) => boolean;
  canSelectMore: boolean;
  onToggle: (uid: string) => void;
};

type SelectionOptions = { bookings: BookingOutput[]; enabled: boolean; userId?: number; resetKey: string };

export function useBulkCancelSelection({ bookings, enabled, userId, resetKey }: SelectionOptions) {
  const [selectedUids, setSelectedUids] = useState<string[]>([]);

  const eligibleBookings = useMemo(
    () => (enabled ? bookings.filter((booking) => isBulkCancellable(booking, userId)) : []),
    [bookings, enabled, userId]
  );

  // Never keep selections the user can no longer see: reset on page, filter or tab changes
  useEffect(() => {
    setSelectedUids([]);
  }, [resetKey]);

  // Drop selections whose booking disappeared or stopped being cancellable after a refetch
  useEffect(() => {
    const eligibleUids = new Set(eligibleBookings.map((booking) => booking.uid));
    setSelectedUids((prev) => {
      const pruned = prev.filter((uid) => eligibleUids.has(uid));
      return pruned.length === prev.length ? prev : pruned;
    });
  }, [eligibleBookings]);

  const selectedBookings = useMemo(() => {
    const selectedSet = new Set(selectedUids);
    return eligibleBookings.filter((booking) => selectedSet.has(booking.uid));
  }, [eligibleBookings, selectedUids]);
  const canSelectMore = selectedBookings.length < Math.min(eligibleBookings.length, BULK_CANCEL_LIMIT);

  const selection = useMemo<BookingRowSelection | undefined>(() => {
    if (eligibleBookings.length === 0) return undefined;
    const eligibleUids = new Set(eligibleBookings.map((booking) => booking.uid));
    const selectedSet = new Set(selectedUids);
    return {
      isSelectable: (uid) => eligibleUids.has(uid),
      isSelected: (uid) => selectedSet.has(uid),
      canSelectMore,
      onToggle: (uid) =>
        setSelectedUids((prev) => {
          if (prev.includes(uid)) return prev.filter((selectedUid) => selectedUid !== uid);
          return prev.length < BULK_CANCEL_LIMIT ? [...prev, uid] : prev;
        }),
    };
  }, [eligibleBookings, selectedUids, canSelectMore]);

  return {
    selection,
    selectedBookings,
    canSelectMore,
    selectAll: () => setSelectedUids(eligibleBookings.slice(0, BULK_CANCEL_LIMIT).map(({ uid }) => uid)),
    clearSelection: () => setSelectedUids([]),
    deselect: (uids: string[]) => setSelectedUids((prev) => prev.filter((uid) => !uids.includes(uid))),
  };
}
