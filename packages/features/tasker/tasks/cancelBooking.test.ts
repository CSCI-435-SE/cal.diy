import handleCancelBooking from "@calcom/features/bookings/lib/handleCancelBooking";
import { describe, expect, it, vi } from "vitest";
import { cancelBooking } from "./cancelBooking";

vi.mock("@calcom/features/bookings/lib/handleCancelBooking", () => ({
  default: vi.fn(),
}));

describe("cancelBooking task", () => {
  it("runs the deferred cancellation with the original request data and user", async () => {
    const bookingData = { uid: "abc123", cancellationReason: "Conflict", allRemainingBookings: false };

    await cancelBooking(JSON.stringify({ bookingData, userId: 7 }));

    expect(handleCancelBooking).toHaveBeenCalledWith({ bookingData, userId: 7 });
  });

  it("rejects a malformed payload instead of cancelling", async () => {
    vi.mocked(handleCancelBooking).mockClear();

    await expect(cancelBooking(JSON.stringify({ bookingData: { uid: "abc123" } }))).rejects.toThrow();
    expect(handleCancelBooking).not.toHaveBeenCalled();
  });
});
