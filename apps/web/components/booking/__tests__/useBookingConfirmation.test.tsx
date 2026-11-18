import { BookingStatus } from "@calcom/prisma/enums";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useBookingConfirmation } from "../hooks/useBookingConfirmation";

type MutationOptions = { onSuccess: (data: { status: BookingStatus }) => void };

const { mockMutate, invalidateBookings, invalidateUnconfirmedCount, mutationOptions } = vi.hoisted(() => ({
  mockMutate: vi.fn(),
  invalidateBookings: vi.fn(),
  invalidateUnconfirmedCount: vi.fn(),
  mutationOptions: { current: null as MutationOptions | null },
}));

vi.mock("@calcom/trpc/react", () => ({
  trpc: {
    useUtils: () => ({
      viewer: {
        bookings: { invalidate: invalidateBookings },
        me: { bookingUnconfirmedCount: { invalidate: invalidateUnconfirmedCount } },
      },
    }),
    viewer: {
      bookings: {
        confirm: {
          useMutation: (options: MutationOptions) => {
            mutationOptions.current = options;
            return { mutate: mockMutate, isPending: false };
          },
        },
      },
    },
  },
}));

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({ t: (key: string) => key }),
}));

vi.mock("@calcom/ui/components/toast", () => ({ showToast: vi.fn() }));

describe("useBookingConfirmation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutationOptions.current = null;
  });

  it.each([BookingStatus.ACCEPTED, BookingStatus.REJECTED])(
    "refreshes bookings (including the occurrences list) and the unconfirmed count after %s",
    (status) => {
      renderHook(() => useBookingConfirmation());

      act(() => mutationOptions.current?.onSuccess({ status }));

      expect(invalidateBookings).toHaveBeenCalledTimes(1);
      expect(invalidateUnconfirmedCount).toHaveBeenCalledTimes(1);
    }
  );

  it("sends a single-booking request when used outside a bulk context", () => {
    const { result } = renderHook(() => useBookingConfirmation());

    act(() => result.current.bookingConfirm({ bookingId: 3, confirmed: true, recurringEventId: "rec" }));

    expect(mockMutate).toHaveBeenCalledWith({ bookingId: 3, confirmed: true, reason: "" });
  });

  it.each([{ isTabRecurring: true }, { isTabUnconfirmed: true }])(
    "keeps Confirm all sending the series id (%o)",
    (tab) => {
      const { result } = renderHook(() => useBookingConfirmation({ isRecurring: true, ...tab }));

      act(() => result.current.bookingConfirm({ bookingId: 3, confirmed: true, recurringEventId: "rec" }));

      expect(mockMutate).toHaveBeenCalledWith({
        bookingId: 3,
        confirmed: true,
        reason: "",
        recurringEventId: "rec",
      });
    }
  );
});
