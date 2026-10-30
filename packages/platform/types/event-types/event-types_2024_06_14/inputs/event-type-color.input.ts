import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsHexColor, IsOptional, IsString, Matches } from "class-validator";

// Same rule as the stored eventTypeColor schema (hexColor in @calcom/prisma/zod-utils). @IsHexColor is
// looser, and a stored value that fails the schema makes every reader drop the whole color object.
export const BOOKING_PAGE_HEX_COLOR = /^#([0-9A-Fa-f]{3}){1,2}$/;

// Class representing the event type colors
export class EventTypeColor_2024_06_14 {
  @IsHexColor()
  @IsString()
  @ApiProperty({
    description: "Color used for event types in light theme",
    example: "#292929",
  })
  lightThemeHex!: string;

  @IsHexColor()
  @IsString()
  @ApiProperty({
    description: "Color used for event types in dark theme",
    example: "#fafafa",
  })
  darkThemeHex!: string;

  @IsOptional()
  @IsString()
  @Matches(BOOKING_PAGE_HEX_COLOR, {
    message: "bookingPageBackgroundHex must be a hex color such as #ffffff",
  })
  @ApiPropertyOptional({
    description:
      "Background color shown to bookers on the booking page. On update, leave it out to keep the stored color, or send null to clear it.",
    example: "#ffffff",
    type: String,
    nullable: true,
  })
  bookingPageBackgroundHex?: string | null;

  @IsOptional()
  @IsString()
  @Matches(BOOKING_PAGE_HEX_COLOR, {
    message: "bookingPageTextHex must be a hex color such as #111111",
  })
  @ApiPropertyOptional({
    description:
      "Text color shown to bookers on the booking page. On update, leave it out to keep the stored color, or send null to clear it.",
    example: "#111111",
    type: String,
    nullable: true,
  })
  bookingPageTextHex?: string | null;
}

export type EventTypeColorsTransformedSchema = {
  darkEventTypeColor: string;
  lightEventTypeColor: string;
  backgroundColor?: string;
  textColor?: string;
};
