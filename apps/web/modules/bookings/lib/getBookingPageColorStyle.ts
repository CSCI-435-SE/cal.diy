import type { BookingPageColors } from "@calcom/features/eventtypes/lib/getBookingPageColors";
import type { CSSProperties } from "react";

// An inline style renders on the server, so the page never flashes the theme colors, and the
// values stay inside this booker during client navigation to another event.
export function getBookingPageColorStyle(colors: BookingPageColors | null | undefined): CSSProperties {
  if (!colors) return {};

  const { backgroundColor, textColor } = colors;
  // The booker container paints from --cal-bg-muted in dark mode, so both must be set.
  const backgroundVariables = backgroundColor
    ? { "--cal-bg": backgroundColor, "--cal-bg-muted": backgroundColor }
    : {};
  const textVariables = textColor
    ? {
        "--cal-text": textColor,
        "--cal-text-emphasis": textColor,
        // Mixing with transparent keeps secondary text readable over any background color.
        "--cal-text-subtle": `color-mix(in srgb, ${textColor} 70%, transparent)`,
        "--cal-text-muted": `color-mix(in srgb, ${textColor} 70%, transparent)`,
      }
    : {};

  return { ...backgroundVariables, ...textVariables } as CSSProperties;
}
