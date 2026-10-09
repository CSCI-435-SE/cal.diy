import { afterEach, describe, expect, it, vi } from "vitest";
import { cancelBookingByUid, isBulkCancellable } from "./bulkCancel";

const now = new Date("2026-10-08T12:00:00.000Z");
const hostBooking = {
  status: "ACCEPTED",
  endTime: "2026-10-09T10:00:00.000Z",
  user: { id: 1 },
  eventType: { disableCancelling: false },
};

describe("isBulkCancellable", () => {
  it.each([
    ["the host's upcoming accepted booking", {}, 1, true],
    ["another host's booking", { user: { id: 2 } }, 1, false],
    ["a booking without a host", { user: null }, 1, false],
    ["a signed-out user", {}, undefined, false],
    ["an unconfirmed booking", { status: "PENDING" }, 1, false],
    ["a cancelled booking", { status: "CANCELLED" }, 1, false],
    ["a booking that has ended", { endTime: "2026-10-08T11:00:00.000Z" }, 1, false],
    ["an event type that disables cancelling", { eventType: { disableCancelling: true } }, 1, false],
  ] as const)("%s → %s", (_name, overrides, userId, expected) => {
    expect(isBulkCancellable({ ...hostBooking, ...overrides }, userId, now)).toBe(expected);
  });
});

describe("cancelBookingByUid", () => {
  afterEach(() => vi.unstubAllGlobals());

  const stubFetch = (cancelResponse: Response | Error) => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrfToken: "token-1" })))
      .mockImplementationOnce(() =>
        cancelResponse instanceof Error ? Promise.reject(cancelResponse) : Promise.resolve(cancelResponse)
      );
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  };

  it("posts the UID, reason and a fresh CSRF token without cancelling a whole series", async () => {
    const fetchMock = stubFetch(new Response(JSON.stringify({ success: true }), { status: 200 }));

    const request = { uid: "uid-1", cancellationReason: "Ill", cancelledBy: "h@x.com" };

    expect(await cancelBookingByUid(request)).toEqual({ ok: true });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(["/api/csrf?sameSite=none", "/api/cancel"]);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ ...request, csrfToken: "token-1" });
  });

  it.each([
    [
      new Response(JSON.stringify({ message: "Rate limit exceeded" }), { status: 429 }),
      { status: 429, message: "Rate limit exceeded" },
    ],
    [new Error("offline"), { status: 0 }],
  ])("reports failures instead of throwing (%#)", async (response, expected) => {
    stubFetch(response);

    expect(await cancelBookingByUid({ uid: "uid-1", cancellationReason: "Ill" })).toEqual({
      ok: false,
      ...expected,
    });
  });
});
