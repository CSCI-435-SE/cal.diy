import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BulkCancelBookings } from "./BulkCancelBookings";

const { cancelBookingByUid, invalidate } = vi.hoisted(() => ({
  cancelBookingByUid: vi.fn(),
  invalidate: vi.fn(),
}));

vi.mock("../lib/bulkCancel", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/bulkCancel")>()),
  cancelBookingByUid,
}));
vi.mock("@calcom/trpc/react", () => ({
  trpc: { useUtils: () => ({ viewer: { bookings: { invalidate } } }) },
}));
vi.mock("@calcom/lib/hooks/useLocale", () => ({ useLocale: () => ({ t: (key: string) => key }) }));

const bookings = [
  { uid: "a", title: "Standup" },
  { uid: "b", title: "1:1" },
];

const renderBar = (onCancelled = vi.fn()) =>
  render(
    <BulkCancelBookings
      selectedBookings={bookings}
      canSelectMore={false}
      userEmail="host@example.com"
      onSelectAll={vi.fn()}
      onClearSelection={vi.fn()}
      onCancelled={onCancelled}
    />
  );

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

  it("cancels one booking at a time, continues after a failure and refreshes the list", async () => {
    cancelBookingByUid.mockImplementation(async ({ uid }: { uid: string }) =>
      uid === "a" ? { ok: false, status: 400, message: "Already cancelled" } : { ok: true }
    );
    const onCancelled = vi.fn();
    renderBar(onCancelled);
    fireEvent.click(screen.getByTestId("bulk-cancel-open"));
    fireEvent.change(screen.getByTestId("bulk-cancel-reason"), { target: { value: " I'm ill " } });
    fireEvent.click(screen.getByTestId("bulk-cancel-confirm"));

    await waitFor(() => expect(onCancelled).toHaveBeenCalledWith(["b"]));
    expect(cancelBookingByUid.mock.calls.map(([args]) => args)).toEqual([
      { uid: "a", cancellationReason: "I'm ill", cancelledBy: "host@example.com" },
      { uid: "b", cancellationReason: "I'm ill", cancelledBy: "host@example.com" },
    ]);
    expect(screen.getByText(/Already cancelled/)).toBeInTheDocument();
    expect(screen.getByText("bulk_cancel_retry_failed")).toBeInTheDocument();
    expect(invalidate).toHaveBeenCalled();
  });
});
