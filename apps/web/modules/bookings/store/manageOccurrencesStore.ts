import { create } from "zustand";

interface ManageOccurrencesState {
  bookingId: number | null;
  setBookingId: (bookingId: number | null) => void;
}

// Kept outside the booking row: confirming or rejecting a date can change which booking represents the
// series, which replaces the row, and the dialog has to stay open through that.
export const useManageOccurrencesStore = create<ManageOccurrencesState>((set) => ({
  bookingId: null,
  setBookingId: (bookingId) => set({ bookingId }),
}));
