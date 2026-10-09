import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BulkCancelBookings } from "./BulkCancelBookings";

const { cancelBookingByUid, invalidate, showToast } = vi.hoisted(() => ({
  cancelBookingByUid: vi.fn(),
  invalidate: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock("../lib/bulkCancel", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/bulkCancel")>()),
  cancelBookingByUid,
}));
vi.mock("@calcom/trpc/react", () => ({
  trpc: { useUtils: () => ({ viewer: { bookings: { invalidate } } }) },
}));
vi.mock("@calcom/ui/components/toast", () => ({ showToast }));
vi.mock("@calcom/lib/hooks/useLocale", () => ({ useLocale: () => ({ t: (key: string) => key }) }));

const bookings = [
  { uid: "a", title: "Standup" },
  { uid: "b", title: "1:1" },
];

const bar = (onCancelled = vi.fn(), selectedBookings = bookings) => (
  <BulkCancelBookings
    selectedBookings={selectedBookings}
    canSelectMore={false}
    userEmail="host@example.com"
    onSelectAll={vi.fn()}
    onClearSelection={vi.fn()}
    onCancelled={onCancelled}
  />
);
const renderBar = (onCancelled = vi.fn()) => render(bar(onCancelled));
const request = (uid: string) => ({ uid, cancellationReason: "I'm ill", cancelledBy: "host@example.com" });
const sentRequests = () => cancelBookingByUid.mock.calls.map(([args]) => args);

describe("BulkCancelBookings", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("requires a non-blank reason and sends nothing when dismissed", () => {
    renderBar();
    fireEvent.click(screen.getByTestId("bulk-cancel-open"));
    const confirm = screen.getByTestId("bulk-cancel-confirm");

    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByTestId("bulk-cancel-reason"), { target: { value: "   " } });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByTestId("bulk-cancel-reason"), { target: { value: "I'm ill" } });
    expect(confirm).toBeEnabled();
    fireEvent.click(screen.getByText("nevermind"));
    expect(cancelBookingByUid).not.toHaveBeenCalled();
  });

  it("cancels one at a time, continues after a failure, then retries only the failure", async () => {
    cancelBookingByUid.mockImplementation(async ({ uid }: { uid: string }) =>
      uid === "a" ? { ok: false, status: 400, message: "Already cancelled" } : { ok: true }
    );
    const onCancelled = vi.fn();
    const { rerender } = renderBar(onCancelled);
    fireEvent.click(screen.getByTestId("bulk-cancel-open"));
    fireEvent.change(screen.getByTestId("bulk-cancel-reason"), { target: { value: " I'm ill " } });
    fireEvent.click(screen.getByTestId("bulk-cancel-confirm"));

    await waitFor(() => expect(onCancelled).toHaveBeenCalledWith(["b"]));
    expect(sentRequests()).toEqual([request("a"), request("b")]);
    expect(screen.getByText(/Already cancelled/)).toBeInTheDocument();
    expect(invalidate).toHaveBeenCalled();

    // The parent deselects successful bookings, leaving only the failure selected
    rerender(bar(onCancelled, [bookings[0]]));
    cancelBookingByUid.mockResolvedValue({ ok: true });
    fireEvent.click(screen.getByText("bulk_cancel_retry_failed"));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("bulk_cancel_summary", "success"));
    expect(sentRequests()).toEqual([request("a"), request("b"), request("a")]);
  });
});
