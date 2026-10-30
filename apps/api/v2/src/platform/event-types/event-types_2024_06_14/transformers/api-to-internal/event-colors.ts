import type {
  CreateEventTypeInput_2024_06_14,
  EventTypeColorsTransformedSchema,
} from "@calcom/platform-types";

// storedEventTypeColors is the row's current value on update. A booking page color that the input
// leaves out keeps the stored one, so a client that only knows the accent colors does not erase
// what the host set in the editor. null clears it.
export function transformEventColorsApiToInternal(
  inputEventTypeColors: CreateEventTypeInput_2024_06_14["color"],
  storedEventTypeColors?: EventTypeColorsTransformedSchema | null
): EventTypeColorsTransformedSchema | undefined {
  if (!inputEventTypeColors) return undefined;

  const { bookingPageBackgroundHex, bookingPageTextHex } = inputEventTypeColors;
  const backgroundColor =
    bookingPageBackgroundHex === undefined
      ? storedEventTypeColors?.backgroundColor
      : bookingPageBackgroundHex;
  const textColor = bookingPageTextHex === undefined ? storedEventTypeColors?.textColor : bookingPageTextHex;

  return {
    darkEventTypeColor: inputEventTypeColors.darkThemeHex,
    lightEventTypeColor: inputEventTypeColors.lightThemeHex,
    ...(backgroundColor ? { backgroundColor } : {}),
    ...(textColor ? { textColor } : {}),
  };
}
