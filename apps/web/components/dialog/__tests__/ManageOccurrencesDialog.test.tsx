import { BookingStatus } from "@calcom/prisma/enums";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ManageOccurrencesDialog } from "../ManageOccurrencesDialog";

const { mockConfirm, mockUseQuery, occurrencesQuery } = vi.hoisted(() => ({
  mockConfirm: vi.fn(),
  mockUseQuery: vi.fn(),
  occurrencesQuery: { data: [] as unknown[] | undefined, isPending: false },
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
  return {
    ...actual,
    useRouter: vi.fn(() => ({ push: vi.fn() })),
  };
});

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
}));

const hoursFromNow = (hours: number) => new Date(Date.now() + hours * 3600_000);
const occurrence = (id: number, status: BookingStatus, startOffsetHours: number) => ({
  id,
  uid: `uid-${id}`,
  status,
  startTime: hoursFromNow(startOffsetHours),
  endTime: hoursFromNow(startOffsetHours + 1),
});

const renderDialog = (props: Partial<ComponentProps<typeof ManageOccurrencesDialog>> = {}) =>
  render(
    <ManageOccurrencesDialog isOpenDialog setIsOpenDialog={vi.fn()} bookingId={1} userTimeZone="UTC" {...props} />
  );

describe("ManageOccurrencesDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    occurrencesQuery.isPending = false;
    occurrencesQuery.data = [
      occurrence(1, BookingStatus.PENDING, -48),
      occurrence(2, BookingStatus.ACCEPTED, 24),
      occurrence(3, BookingStatus.PENDING, 48),
      occurrence(4, BookingStatus.REJECTED, 72),
      occurrence(5, BookingStatus.CANCELLED, 96),
    ];
  });

  it("lists every occurrence with its status", () => {
    renderDialog();

    const rows = screen.getAllByTestId("occurrence-row");
    expect(rows).toHaveLength(5);
    expect(within(rows[1]).getByText("confirmed")).toBeInTheDocument();
    expect(within(rows[3]).getByText("rejected")).toBeInTheDocument();
    expect(within(rows[4]).getByText("cancelled")).toBeInTheDocument();
  });

  it("only shows Confirm and Reject for upcoming pending occurrences", () => {
    renderDialog();

    const confirmButtons = screen.getAllByTestId("confirm");
    expect(confirmButtons).toHaveLength(1);
    expect(screen.getAllByTestId("reject")).toHaveLength(1);
    expect(confirmButtons[0]).toHaveAttribute("data-booking-uid", "uid-3");
  });

  it("confirms a single occurrence without the recurring series id", () => {
    renderDialog();

    fireEvent.click(screen.getByTestId("confirm"));

    expect(mockConfirm).toHaveBeenCalledWith({ bookingId: 3, confirmed: true, reason: "" });
  });

  it("rejects a single occurrence through the rejection reason dialog", () => {
    renderDialog();

    fireEvent.click(screen.getByTestId("reject"));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Court unavailable" } });
    fireEvent.click(screen.getByTestId("rejection-confirm"));

    expect(mockConfirm).toHaveBeenCalledWith({ bookingId: 3, confirmed: false, reason: "Court unavailable" });
  });

  it("fetches this booking's series only while the dialog is open", () => {
    const { rerender } = renderDialog();
    expect(mockUseQuery).toHaveBeenLastCalledWith({ bookingId: 1 }, { enabled: true });

    rerender(
      <ManageOccurrencesDialog isOpenDialog={false} setIsOpenDialog={vi.fn()} bookingId={1} userTimeZone="UTC" />
    );
    expect(mockUseQuery).toHaveBeenLastCalledWith({ bookingId: 1 }, { enabled: false });
  });

  it("shows the translated title and description", () => {
    renderDialog();

    expect(screen.getByText("manage_occurrences")).toBeInTheDocument();
    expect(screen.getByText("manage_occurrences_description")).toBeInTheDocument();
  });

  it("shows a loading message while the occurrences load", () => {
    occurrencesQuery.isPending = true;
    renderDialog();

    expect(screen.getByText("loading")).toBeInTheDocument();
    expect(screen.queryAllByTestId("occurrence-row")).toHaveLength(0);
  });

  it("shows no rows when the query returns no data", () => {
    occurrencesQuery.data = undefined;
    renderDialog();

    expect(screen.queryAllByTestId("occurrence-row")).toHaveLength(0);
  });

  it("shows each occurrence's date and time in the host's time zone and time format", () => {
    occurrencesQuery.data = [
      {
        id: 9,
        uid: "uid-9",
        status: BookingStatus.ACCEPTED,
        startTime: new Date("2099-03-04T15:00:00Z"),
        endTime: new Date("2099-03-04T15:15:00Z"),
      },
    ];
    renderDialog({ userTimeZone: "America/New_York", userTimeFormat: 12 });

    const row = screen.getByTestId("occurrence-row");
    expect(within(row).getByText("Wed, 4 Mar 2099")).toBeInTheDocument();
    expect(within(row).getByText("10:00am - 10:15am")).toBeInTheDocument();
  });
});
