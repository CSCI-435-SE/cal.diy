// `/api/cancel` rate-limits each user to 10 cancellations per minute, so larger batches would fail partway
export const BULK_CANCEL_LIMIT = 10;

type BulkCancelCandidate = {
  status: string;
  endTime: string | Date;
  user: { id: number } | null;
  eventType: { disableCancelling?: boolean | null } | null;
};

// Mirrors the single "Cancel event" rules for a host's own booking; `/api/cancel` stays the authority
export const isBulkCancellable = (
  booking: BulkCancelCandidate,
  userId: number | undefined,
  now: Date = new Date()
): boolean =>
  !!userId &&
  booking.user?.id === userId &&
  booking.status === "ACCEPTED" &&
  new Date(booking.endTime) >= now &&
  !booking.eventType?.disableCancelling;

export type CancelOutcome = { ok: true } | { ok: false; status: number; message?: string };
export type BulkCancelResult = { uid: string } & CancelOutcome;

// A fresh CSRF token per request because the server deletes the CSRF cookie after each use
export const cancelBookingByUid = async ({
  uid,
  cancellationReason,
  cancelledBy,
}: {
  uid: string;
  cancellationReason: string;
  cancelledBy?: string;
}): Promise<CancelOutcome> => {
  try {
    const csrfResponse = await fetch("/api/csrf?sameSite=none", { cache: "no-store" });
    const { csrfToken } = await csrfResponse.json();
    const response = await fetch("/api/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid, cancellationReason, cancelledBy, csrfToken }),
    });
    if (response.ok) return { ok: true };

    const data = await response.json().catch(() => null);
    return { ok: false, status: response.status, message: data?.message };
  } catch {
    return { ok: false, status: 0 };
  }
};
