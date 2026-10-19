import { eventTypeColor } from "@calcom/prisma/zod-utils";

export type BookingPageColors = {
  backgroundColor?: string;
  textColor?: string;
};

export function getBookingPageColors(storedColors: unknown): BookingPageColors | null {
  const parsed = eventTypeColor.safeParse(storedColors);
  // One malformed row must never break a booking page, so it falls back to the theme colors.
  if (!parsed.success || !parsed.data) return null;

  const { backgroundColor, textColor } = parsed.data;
  if (!backgroundColor && !textColor) return null;

  return {
    ...(backgroundColor ? { backgroundColor } : {}),
    ...(textColor ? { textColor } : {}),
  };
}

// The stored value also holds the accent colors, which the editor promises are never shown to
// bookers, so the public payload carries only the booking page colors.
export function withBookingPageColors<T extends { eventTypeColor: unknown }>(event: T) {
  const { eventTypeColor: storedColors, ...eventWithoutStoredColors } = event;
  return {
    ...eventWithoutStoredColors,
    bookingPageColors: getBookingPageColors(storedColors),
  };
}
