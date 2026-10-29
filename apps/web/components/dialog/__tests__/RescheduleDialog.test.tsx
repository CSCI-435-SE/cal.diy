import { RescheduleReasonRequirement } from "@calcom/prisma/enums";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RescheduleDialog } from "../RescheduleDialog";

const { mockRequestReschedule } = vi.hoisted(() => ({ mockRequestReschedule: vi.fn() }));

vi.mock("@calcom/trpc/react", () => ({
  trpc: {
    useUtils: () => ({ viewer: { bookings: { invalidate: vi.fn() } } }),
    viewer: {
      bookings: {
        requestReschedule: {
          useMutation: () => ({ mutate: mockRequestReschedule, isPending: false }),
        },
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
  useLocale: () => ({ t: (key: string) => key }),
}));

const BOOKING_UID = "booking-uid";
const REQUIRED_FOR_HOST = [
  RescheduleReasonRequirement.MANDATORY_BOTH,
  RescheduleReasonRequirement.MANDATORY_HOST_ONLY,
];

const renderDialog = (requiresRescheduleReason?: RescheduleReasonRequirement | null) =>
  render(
    <RescheduleDialog
      isOpenDialog
      setIsOpenDialog={vi.fn()}
      bookingUid={BOOKING_UID}
      requiresRescheduleReason={requiresRescheduleReason}
    />
  );

const getRequestButton = () => screen.getByTestId("send_request");
const typeReason = (reason: string) =>
  fireEvent.change(screen.getByRole("textbox"), { target: { value: reason } });

describe("RescheduleDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("when the host must give a reason", () => {
    it.each(REQUIRED_FOR_HOST)("%s: disables the request button until a reason is entered", (requirement) => {
      renderDialog(requirement);
      expect(getRequestButton()).toBeDisabled();

      typeReason("Running late");

      expect(getRequestButton()).toBeEnabled();
    });

    it.each(REQUIRED_FOR_HOST)("%s: does not label the reason as optional", (requirement) => {
      renderDialog(requirement);

      expect(screen.queryByText("(Optional)")).not.toBeInTheDocument();
    });

    it("keeps the request button disabled when the reason is only whitespace", () => {
      renderDialog(RescheduleReasonRequirement.MANDATORY_HOST_ONLY);

      typeReason("   ");

      expect(getRequestButton()).toBeDisabled();
    });

    it("sends the reason with the reschedule request", () => {
      renderDialog(RescheduleReasonRequirement.MANDATORY_HOST_ONLY);

      typeReason("Running late");
      fireEvent.click(getRequestButton());

      expect(mockRequestReschedule).toHaveBeenCalledWith({
        bookingUid: BOOKING_UID,
        rescheduleReason: "Running late",
      });
    });
  });

  // Only the host opens this dialog, so an attendee-only requirement leaves the reason optional here.
  describe("when the host does not have to give a reason", () => {
    it.each([
      RescheduleReasonRequirement.MANDATORY_ATTENDEE_ONLY,
      RescheduleReasonRequirement.OPTIONAL_BOTH,
      null,
      undefined,
    ])("%s: labels the reason as optional and allows sending without one", (requirement) => {
      renderDialog(requirement);

      expect(screen.getByText("(Optional)")).toBeInTheDocument();
      expect(getRequestButton()).toBeEnabled();
    });
  });
});
