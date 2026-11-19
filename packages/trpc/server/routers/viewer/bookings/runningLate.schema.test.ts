import { describe, expect, it } from "vitest";
import { ZRunningLateInputSchema } from "./runningLate.schema";

describe("ZRunningLateInputSchema", () => {
  it.each([5, 10, 15, 30])("accepts a %i minute delay", (delayMinutes) => {
    expect(ZRunningLateInputSchema.safeParse({ bookingId: 1, delayMinutes }).success).toBe(true);
  });

  it.each([0, 1, 20, 45, 60, -5])("rejects a %i minute delay", (delayMinutes) => {
    expect(ZRunningLateInputSchema.safeParse({ bookingId: 1, delayMinutes }).success).toBe(false);
  });

  it("rejects a delay sent as a string", () => {
    expect(ZRunningLateInputSchema.safeParse({ bookingId: 1, delayMinutes: "10" }).success).toBe(false);
  });

  it("rejects a request without a delay", () => {
    expect(ZRunningLateInputSchema.safeParse({ bookingId: 1 }).success).toBe(false);
  });

  it("accepts a request without a message", () => {
    const result = ZRunningLateInputSchema.safeParse({ bookingId: 1, delayMinutes: 10 });

    expect(result.success).toBe(true);
    expect(result.data?.message).toBeUndefined();
  });

  it("accepts and trims an optional message", () => {
    const result = ZRunningLateInputSchema.safeParse({
      bookingId: 1,
      delayMinutes: 10,
      message: "  Previous call ran over  ",
    });

    expect(result.data?.message).toBe("Previous call ran over");
  });
});
