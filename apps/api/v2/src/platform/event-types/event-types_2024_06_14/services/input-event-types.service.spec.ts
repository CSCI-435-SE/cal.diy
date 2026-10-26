import type { CreateEventTypeInput_2024_06_14 } from "@calcom/platform-types";
import { BadRequestException } from "@nestjs/common";
import { InputEventTypesService_2024_06_14 } from "./input-event-types.service";
import type { CalendarsService } from "@/platform/calendars/services/calendars.service";
import type { EventTypesRepository_2024_06_14 } from "@/platform/event-types/event-types_2024_06_14/event-types.repository";

type ColorInput = CreateEventTypeInput_2024_06_14["color"];

describe("InputEventTypesService_2024_06_14", () => {
  let service: InputEventTypesService_2024_06_14;

  beforeEach(() => {
    service = new InputEventTypesService_2024_06_14(
      {} as EventTypesRepository_2024_06_14,
      {} as CalendarsService
    );
  });

  describe("validateInputBookingPageColors", () => {
    const accentColors = { lightThemeHex: "#292929", darkThemeHex: "#fafafa" };

    it("accepts a request without color", () => {
      expect(() => service.validateInputBookingPageColors(undefined)).not.toThrow();
    });

    it("accepts accent colors without booking page colors", () => {
      expect(() => service.validateInputBookingPageColors(accentColors)).not.toThrow();
    });

    it("accepts six and three digit hex booking page colors", () => {
      const color: ColorInput = {
        ...accentColors,
        bookingPageBackgroundHex: "#1e293b",
        bookingPageTextHex: "#FFF",
      };

      expect(() => service.validateInputBookingPageColors(color)).not.toThrow();
    });

    it("accepts null, which clears a stored booking page color", () => {
      const color: ColorInput = {
        ...accentColors,
        bookingPageBackgroundHex: null,
        bookingPageTextHex: null,
      };

      expect(() => service.validateInputBookingPageColors(color)).not.toThrow();
    });

    it("rejects a background color that is not hex", () => {
      const color: ColorInput = { ...accentColors, bookingPageBackgroundHex: "red" };

      expect(() => service.validateInputBookingPageColors(color)).toThrow(
        new BadRequestException("color.bookingPageBackgroundHex must be a hex color such as #ffffff")
      );
    });

    // @IsHexColor accepts a value without "#", but the stored eventTypeColor schema does not.
    it("rejects a text color without the leading #", () => {
      const color: ColorInput = { ...accentColors, bookingPageTextHex: "ffffff" };

      expect(() => service.validateInputBookingPageColors(color)).toThrow(
        new BadRequestException("color.bookingPageTextHex must be a hex color such as #ffffff")
      );
    });

    it("rejects a hex value of the wrong length", () => {
      const color: ColorInput = { ...accentColors, bookingPageTextHex: "#ffff" };

      expect(() => service.validateInputBookingPageColors(color)).toThrow(BadRequestException);
    });

    it("rejects a value that is not a string", () => {
      const color = { ...accentColors, bookingPageBackgroundHex: 123 } as unknown as ColorInput;

      expect(() => service.validateInputBookingPageColors(color)).toThrow(
        new BadRequestException("color.bookingPageBackgroundHex must be a hex color such as #ffffff")
      );
    });
  });
});
