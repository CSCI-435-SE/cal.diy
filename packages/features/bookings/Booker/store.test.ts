import { BookerLayouts } from "@calcom/prisma/zod-utils";
import { describe, expect, it } from "vitest";
import { createBookerStore } from "./store";

const rescheduleOf = (rescheduleUid: string) => ({
  username: "pro",
  eventSlug: "weekly",
  eventId: 1,
  layout: BookerLayouts.MONTH_VIEW,
  rescheduleUid,
});

describe("Booker store reschedule scope", () => {
  it("goes back to a single occurrence when the Booker loads another booking", () => {
    const store = createBookerStore();
    store.getState().initialize(rescheduleOf("series-a-occurrence"));
    store.getState().setRescheduleScope("following");

    store.getState().initialize(rescheduleOf("series-b-occurrence"));

    expect(store.getState().rescheduleScope).toBe("single");
  });

  it("keeps the attendee's choice when the same booking is initialized again", () => {
    const store = createBookerStore();
    store.getState().initialize(rescheduleOf("series-a-occurrence"));
    store.getState().setRescheduleScope("following");

    store.getState().initialize(rescheduleOf("series-a-occurrence"));

    expect(store.getState().rescheduleScope).toBe("following");
  });

  it("keeps the attendee's choice when an unrelated setting such as the layout changes", () => {
    const store = createBookerStore();
    store.getState().initialize(rescheduleOf("series-a-occurrence"));
    store.getState().setRescheduleScope("following");

    store.getState().initialize({ ...rescheduleOf("series-a-occurrence"), layout: BookerLayouts.WEEK_VIEW });

    expect(store.getState().rescheduleScope).toBe("following");
  });
});
