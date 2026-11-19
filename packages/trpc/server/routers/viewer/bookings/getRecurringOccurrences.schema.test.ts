import { describe, expect, it } from "vitest";
import { ZGetRecurringOccurrencesInputSchema } from "./getRecurringOccurrences.schema";

describe("ZGetRecurringOccurrencesInputSchema", () => {
  it("accepts an integer booking id", () => {
    expect(ZGetRecurringOccurrencesInputSchema.safeParse({ bookingId: 5 })).toEqual({
      success: true,
      data: { bookingId: 5 },
    });
  });

  it.each([{}, { bookingId: 1.5 }, { bookingId: "5" }])("rejects %o", (input) => {
    expect(ZGetRecurringOccurrencesInputSchema.safeParse(input).success).toBe(false);
  });
});
