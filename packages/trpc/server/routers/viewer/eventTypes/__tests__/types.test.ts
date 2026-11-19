import { describe, expect, it } from "vitest";
import { ZUpdateInputSchema } from "../types";

describe("ZUpdateInputSchema minimumCancellationNotice", () => {
  it.each([1440, 1, 0, null])("accepts %s", (minimumCancellationNotice) => {
    const result = ZUpdateInputSchema.safeParse({ id: 1, minimumCancellationNotice });

    expect(result.success).toBe(true);
    expect(result.data?.minimumCancellationNotice).toBe(minimumCancellationNotice);
  });

  it("leaves the stored notice untouched when the field is omitted", () => {
    const result = ZUpdateInputSchema.safeParse({ id: 1 });

    expect(result.success).toBe(true);
    expect(result.data).not.toHaveProperty("minimumCancellationNotice");
  });

  it.each([-1, 1.5, "60"])("rejects %s", (minimumCancellationNotice) => {
    expect(ZUpdateInputSchema.safeParse({ id: 1, minimumCancellationNotice }).success).toBe(false);
  });
});
