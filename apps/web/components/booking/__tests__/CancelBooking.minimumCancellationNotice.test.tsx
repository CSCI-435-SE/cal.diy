import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import CancelBooking from "../CancelBooking";

vi.mock("@calcom/embed-core/embed-iframe", () => ({ sdkActionManager: null }));
vi.mock("@calcom/lib/hooks/useLocale", () => ({ useLocale: () => ({ t: (key: string) => key }) }));
vi.mock("@calcom/lib/hooks/useRefreshData", () => ({ useRefreshData: () => vi.fn() }));
vi.mock("@calcom/features/bookings/lib/payment/shouldChargeNoShowCancellationFee", () => ({
  shouldChargeNoShowCancellationFee: () => false,
}));

const originalScrollIntoView = Element.prototype.scrollIntoView;
const originalFetch = global.fetch;

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

afterAll(() => {
  Element.prototype.scrollIntoView = originalScrollIntoView;
});

const mockCancelResponse = (status: number, body: Record<string, unknown>) => {
  global.fetch = vi.fn().mockImplementation((url: string) => {
    if (url.startsWith("/api/csrf")) {
      return Promise.resolve({ json: () => Promise.resolve({ csrfToken: "a".repeat(64) }) });
    }
    return Promise.resolve({ status, ok: false, json: () => Promise.resolve(body) });
  }) as unknown as typeof fetch;
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
  global.fetch = originalFetch;
});

const renderCancelBooking = () =>
  render(
    <CancelBooking
      booking={{
        uid: "booking-uid",
        title: "Lesson",
        id: 1,
        startTime: new Date(Date.now() + 30 * 60 * 1000),
      }}
      profile={{ name: "Coach", slug: "coach" }}
      team={null}
      isHost={false}
      recurringEvent={null}
      setIsCancellationMode={vi.fn()}
      theme="light"
      allRemainingBookings={false}
      seatReferenceUid={undefined}
      currentUserEmail="attendee@example.com"
      bookingCancelledEventProps={{
        booking: {},
        organizer: { name: "Coach", email: "coach@example.com", timeZone: "UTC" },
        eventType: {},
      }}
      internalNotePresets={[]}
      renderContext="booking-single-view"
    />
  );

describe("CancelBooking minimum cancellation notice error", () => {
  it("shows the translated message when the server rejects for the minimum cancellation notice", async () => {
    mockCancelResponse(403, {
      success: false,
      code: "minimum_cancellation_notice",
      message: "English-only server message",
    });
    renderCancelBooking();

    fireEvent.click(screen.getByTestId("confirm_cancel"));

    expect(await screen.findByText("cancellation_unavailable_minimum_notice")).toBeInTheDocument();
    expect(screen.queryByText("English-only server message")).not.toBeInTheDocument();
  });

  it("still shows the server message for other errors", async () => {
    mockCancelResponse(400, { success: false, message: "This booking has already been cancelled." });
    renderCancelBooking();

    fireEvent.click(screen.getByTestId("confirm_cancel"));

    expect(await screen.findByText("This booking has already been cancelled.")).toBeInTheDocument();
  });
});
