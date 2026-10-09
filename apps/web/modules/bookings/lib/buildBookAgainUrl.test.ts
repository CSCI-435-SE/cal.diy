import { describe, expect, it } from "vitest";

import { buildBookAgainUrl } from "./buildBookAgainUrl";

const attendee = { name: "John Doe", email: "john@example.com" };

describe("buildBookAgainUrl", () => {
  it("should build a user event link prefilled with the attendee", () => {
    const url = buildBookAgainUrl({
      eventType: { slug: "30min", team: null },
      username: "organizer",
      attendee,
    });

    expect(url).toBe("/organizer/30min?name=John+Doe&email=john%40example.com");
  });

  it("should build a team event link when the event type belongs to a team", () => {
    const url = buildBookAgainUrl({
      eventType: { slug: "sales-call", team: { slug: "acme" } },
      username: "organizer",
      attendee,
    });

    expect(url).toBe("/team/acme/sales-call?name=John+Doe&email=john%40example.com");
  });

  it("should encode special characters in the attendee name and email", () => {
    const url = buildBookAgainUrl({
      eventType: { slug: "30min" },
      username: "organizer",
      attendee: { name: "Zoë & Ana", email: "zoe+test@example.com" },
    });

    const searchParams = new URLSearchParams(url?.split("?")[1]);
    expect(searchParams.get("name")).toBe("Zoë & Ana");
    expect(searchParams.get("email")).toBe("zoe+test@example.com");
  });

  it("should return null when the booking has no event type", () => {
    expect(buildBookAgainUrl({ eventType: null, username: "organizer", attendee })).toBeNull();
  });

  it("should return null when the event type has no slug", () => {
    expect(buildBookAgainUrl({ eventType: { slug: null }, username: "organizer", attendee })).toBeNull();
  });

  it("should return null for a non-team event when the organizer has no username", () => {
    expect(buildBookAgainUrl({ eventType: { slug: "30min" }, username: null, attendee })).toBeNull();
  });
});
