import { BookingStatus } from "@calcom/prisma/enums";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useManageOccurrencesStore } from "../store/manageOccurrencesStore";
import { ManageOccurrencesDialogHost } from "./ManageOccurrencesDialogHost";

const { mockConfirm, mockUseQuery, occurrencesQuery } = vi.hoisted(() => ({
  mockConfirm: vi.fn(),
  mockUseQuery: vi.fn(),
  occurrencesQuery: { data: [] as unknown[], isPending: false },
}));

vi.mock("@calcom/trpc/react", () => ({
  trpc: {
    useUtils: () => ({
      viewer: { bookings: { invalidate: vi.fn() }, me: { bookingUnconfirmedCount: { invalidate: vi.fn() } } },
    }),
    viewer: {
      bookings: {
        getRecurringOccurrences: {
          useQuery: (input: unknown, options: unknown) => {
            mockUseQuery(input, options);
            return occurrencesQuery;
          },
        },
        confirm: { useMutation: () => ({ mutate: mockConfirm, isPending: false }) },
      },
    },
  },
}));

// The controlled Dialog calls useRouter, which throws outside a mounted Next.js app router.
vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();
  return { ...actual, useRouter: vi.fn(() => ({ push: vi.fn() })) };
});

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
}));

const inTwoDays = new Date(Date.now() + 48 * 3600_000);
const occurrence = (status: BookingStatus) => ({
  id: 3,
  uid: "uid-3",
  status,
  startTime: inTwoDays,
  endTime: new Date(inTwoDays.getTime() + 3600_000),
});

const openFor = (bookingId: number | null) =>
  act(() => useManageOccurrencesStore.getState().setBookingId(bookingId));

describe("ManageOccurrencesDialogHost", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    openFor(null);
    occurrencesQuery.data = [occurrence(BookingStatus.PENDING)];
  });

  it("renders nothing until a series is chosen", () => {
    render(<ManageOccurrencesDialogHost userTimeZone="UTC" />);

    expect(screen.queryByTestId("manage-occurrences-dialog")).not.toBeInTheDocument();
  });

  it("opens the dialog for the booking chosen from the list", () => {
    render(<ManageOccurrencesDialogHost userTimeZone="UTC" />);

    openFor(7);

    expect(screen.getByTestId("manage-occurrences-dialog")).toBeInTheDocument();
    expect(mockUseQuery).toHaveBeenLastCalledWith({ bookingId: 7 }, { enabled: true });
  });

  it("stays open with the refreshed statuses after a date is confirmed", () => {
    const { rerender } = render(<ManageOccurrencesDialogHost userTimeZone="UTC" />);
    openFor(7);

    fireEvent.click(screen.getByTestId("confirm"));
    expect(mockConfirm).toHaveBeenCalledWith({ bookingId: 3, confirmed: true, reason: "" });

    occurrencesQuery.data = [occurrence(BookingStatus.ACCEPTED)];
    rerender(<ManageOccurrencesDialogHost userTimeZone="UTC" />);

    expect(screen.getByTestId("manage-occurrences-dialog")).toBeInTheDocument();
    expect(screen.getByText("confirmed")).toBeInTheDocument();
    expect(mockUseQuery).toHaveBeenLastCalledWith({ bookingId: 7 }, { enabled: true });
  });

  it("forgets the chosen series when the dialog is closed", () => {
    render(<ManageOccurrencesDialogHost userTimeZone="UTC" />);
    openFor(7);

    fireEvent.click(screen.getByTestId("dialog-rejection"));

    expect(useManageOccurrencesStore.getState().bookingId).toBeNull();
    expect(screen.queryByTestId("manage-occurrences-dialog")).not.toBeInTheDocument();
  });

  it("forgets the chosen series when the bookings list unmounts", () => {
    const { unmount } = render(<ManageOccurrencesDialogHost userTimeZone="UTC" />);
    openFor(7);

    unmount();

    expect(useManageOccurrencesStore.getState().bookingId).toBeNull();
  });
});
