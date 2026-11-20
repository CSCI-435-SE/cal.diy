import { ErrorCode } from "@calcom/lib/errorCodes";
import { WaitlistStatus } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WaitlistEntryDto, WaitlistRepository } from "../repositories/WaitlistRepository";
import { WAITLIST_CLAIM_WINDOW_MS, WaitlistService } from "./WaitlistService";

const HOUR = 60 * 60 * 1000;
const NOW = Date.parse("2026-11-01T12:00:00Z");

type Row = WaitlistEntryDto & { dayStart: Date; dayEnd: Date; slotStart: Date | null; createdAt: number };

function makeFakeRepo() {
  const rows: Row[] = [];
  const holds: { uid: string; releaseAt: Date; isSeat: boolean }[] = [];
  let bookedEmails: string[] | null = null;
  const bookedTimes: Date[] = [];
  const attendeeCounts: { startTime: Date; attendees: number }[] = [];
  let seatsPerTimeSlot: number | null = null;
  let eventTypeDeleted = false;
  // Event type 3 is a second event type of the same host, to check the setting is per event type
  const waitlistDisabledFor = new Set<number>();
  // Bookings at one specific time; any other time falls back to `bookedEmails`
  const bookedAt = new Map<number, string[] | null>();
  let seq = 0;
  const repo = {
    findWaitingByEmailAndDay: async (q: {
      eventTypeId: number;
      email: string;
      dayStart: Date;
      slotStart: Date | null;
    }) =>
      rows.find(
        (r) =>
          r.status === WaitlistStatus.WAITING &&
          r.eventTypeId === q.eventTypeId &&
          r.email === q.email &&
          r.dayStart.getTime() === q.dayStart.getTime() &&
          r.slotStart?.getTime() === q.slotStart?.getTime()
      ) ?? null,
    create: async (data: Omit<Row, "id" | "uid" | "status" | "createdAt" | keyof Offer>) => {
      const row: Row = {
        ...data,
        id: ++seq,
        uid: `uid-${seq}`,
        status: WaitlistStatus.WAITING,
        hostUserId: null,
        offerStart: null,
        offerEnd: null,
        offerExpiresAt: null,
        createdAt: seq,
      };
      rows.push(row);
      return row;
    },
    findByUid: async (uid: string) => rows.find((r) => r.uid === uid) ?? null,
    findById: async (id: number) => rows.find((r) => r.id === id) ?? null,
    findOldestWaitingForTime: async (q: { eventTypeId: number; time: Date }) =>
      rows
        .filter(
          (r) =>
            r.status === WaitlistStatus.WAITING &&
            r.eventTypeId === q.eventTypeId &&
            (r.slotStart
              ? r.slotStart.getTime() === q.time.getTime()
              : r.dayStart <= q.time && r.dayEnd > q.time)
        )
        .sort((a, b) => a.createdAt - b.createdAt)[0] ?? null,
    transition: async (id: number, from: WaitlistStatus, to: WaitlistStatus, offer?: Offer | null) => {
      const row = rows.find((r) => r.id === id);
      if (!row || row.status !== from) return false;
      row.status = to;
      if (offer === null)
        Object.assign(row, { hostUserId: null, offerStart: null, offerEnd: null, offerExpiresAt: null });
      else if (offer) Object.assign(row, offer);
      return true;
    },
    findEventTypeForWaitlist: async (id: number) =>
      (id === 1 && !eventTypeDeleted) || id === 3
        ? {
            id,
            title: id === 1 ? "Intro call" : "Office hours",
            slug: id === 1 ? "intro" : "office-hours",
            length: 30,
            seatsPerTimeSlot,
            disableWaitlist: waitlistDisabledFor.has(id),
            team: null,
            owner: { username: "host" },
            users: [],
          }
        : null,
    createSlotHold: async (h: { uid: string; releaseAt: Date; isSeat: boolean }) => {
      holds.push({ uid: h.uid, releaseAt: h.releaseAt, isSeat: h.isSeat });
    },
    deleteSlotHolds: async (uid: string) => {
      for (let i = holds.length - 1; i >= 0; i--) if (holds[i].uid === uid) holds.splice(i, 1);
    },
    findActiveBookingAttendeeEmailsAt: async (q: { startTime?: Date }) => {
      const time = q.startTime?.getTime();
      return time !== undefined && bookedAt.has(time) ? (bookedAt.get(time) ?? null) : bookedEmails;
    },
    findOfferedForTime: async (q: { eventTypeId: number; time: Date }) =>
      rows.filter(
        (r) =>
          r.status === WaitlistStatus.OFFERED &&
          r.eventTypeId === q.eventTypeId &&
          r.offerStart?.getTime() === q.time.getTime()
      ),
    findActiveBookingStartTimes: async (q: { from: Date; to: Date }) =>
      bookedTimes.filter((t) => t >= q.from && t < q.to),
    findActiveBookingAttendeeCounts: async (q: { from: Date; to: Date }) =>
      attendeeCounts.filter((c) => c.startTime >= q.from && c.startTime < q.to),
  };
  return {
    repo: repo as unknown as WaitlistRepository,
    rows,
    holds,
    bookedTimes,
    attendeeCounts,
    setBooked: (emails: string[] | null) => {
      bookedEmails = emails;
    },
    setSeats: (seats: number | null) => {
      seatsPerTimeSlot = seats;
    },
    setBookedAt: (time: Date, emails: string[] | null) => {
      bookedAt.set(time.getTime(), emails);
    },
    deleteEventType: () => {
      eventTypeDeleted = true;
    },
    setWaitlistDisabled: (disabled: boolean, eventTypeId = 1) => {
      if (disabled) waitlistDisabledFor.add(eventTypeId);
      else waitlistDisabledFor.delete(eventTypeId);
    },
  };
}
type Offer = { hostUserId: number; offerStart: Date; offerEnd: Date; offerExpiresAt: Date };

describe("WaitlistService", () => {
  let fake: ReturnType<typeof makeFakeRepo>;
  let service: WaitlistService;
  const scheduleOfferExpiry = vi.fn();
  const sendOfferEmail = vi.fn();
  let clock = NOW;
  const expireAfterWindow = (entryId: number) => {
    clock = NOW + WAITLIST_CLAIM_WINDOW_MS;
    return service.expireOffer(entryId);
  };

  const join = (email: string, date = "2026-11-03") =>
    service.join({ eventTypeId: 1, name: email, email, timeZone: "UTC", date });
  const slot = (hoursFromNow: number) => ({
    eventTypeId: 1,
    hostUserId: 9,
    start: new Date(NOW + hoursFromNow * HOUR),
    end: new Date(NOW + hoursFromNow * HOUR + HOUR / 2),
  });
  // 2026-11-03T10:00Z: inside the joined day and well over 6h away
  const freedSlot = () => slot(46);

  beforeEach(() => {
    fake = makeFakeRepo();
    clock = NOW;
    scheduleOfferExpiry.mockReset();
    sendOfferEmail.mockReset();
    service = new WaitlistService({
      waitlistRepo: fake.repo,
      webappUrl: "https://app.test",
      scheduleOfferExpiry,
      sendOfferEmail,
      now: () => clock,
    });
  });

  it("rejects joining a day that ends within 6 hours", async () => {
    // NOW is 12:00 UTC, so today ends in 12h (allowed) but in UTC+8 it ends in 4h
    await expect(
      service.join({
        eventTypeId: 1,
        name: "a",
        email: "a@x.com",
        timeZone: "Asia/Singapore",
        date: "2026-11-01",
      })
    ).rejects.toThrow();
    await expect(join("a@x.com", "2026-11-01")).resolves.toBeTruthy();
  });

  it("rejects a specific time less than 6 hours away or outside the selected day", async () => {
    const joinAt = (hours: number, date = "2026-11-01") =>
      service.join({
        eventTypeId: 1,
        name: "a",
        email: "a@x.com",
        timeZone: "UTC",
        date,
        slotStart: new Date(NOW + hours * HOUR),
      });
    await expect(joinAt(5)).rejects.toThrow();
    await expect(joinAt(7, "2026-11-02")).rejects.toThrow();
    await expect(joinAt(7)).resolves.toBeTruthy();
  });

  it("offers a slot to a specific-time entry only for that exact time", async () => {
    await service.join({
      eventTypeId: 1,
      name: "a",
      email: "time@x.com",
      timeZone: "UTC",
      date: "2026-11-03",
      slotStart: slot(47).start,
    });
    expect(await service.offerSpot(freedSlot())).toEqual([]);
    expect(await service.offerSpot(slot(47))).toEqual([1]);
  });

  it("only reports booked times more than 6 hours away", async () => {
    fake.bookedTimes.push(new Date(NOW + 2 * HOUR), new Date(NOW + 8 * HOUR));
    const times = await service.getBookedTimes({
      eventTypeId: 1,
      from: new Date(NOW),
      to: new Date(NOW + 48 * HOUR),
    });
    expect(times).toEqual([new Date(NOW + 8 * HOUR)]);
  });

  it("does not create duplicate entries for the same person and day", async () => {
    await join("A@x.com");
    await join("a@x.com");
    expect(fake.rows).toHaveLength(1);
  });

  it("offers a freed slot to the longest-waiting person and holds it for 6 hours", async () => {
    await join("first@x.com");
    await join("second@x.com");

    const ids = await service.offerSpot(freedSlot());

    expect(ids).toEqual([1]);
    expect(fake.rows[0].status).toBe(WaitlistStatus.OFFERED);
    expect(fake.rows[1].status).toBe(WaitlistStatus.WAITING);
    const expiresAt = new Date(NOW + WAITLIST_CLAIM_WINDOW_MS);
    expect(fake.holds).toEqual([{ uid: "uid-1", releaseAt: expiresAt, isSeat: false }]);
    expect(scheduleOfferExpiry).toHaveBeenCalledWith(1, expiresAt);
    expect(sendOfferEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "first@x.com",
        claimUrl: "https://app.test/api/waitlist/claim?uid=uid-1",
        leaveUrl: "https://app.test/api/waitlist/leave?uid=uid-1",
      })
    );
  });

  it("does not offer slots starting less than 6 hours from now", async () => {
    await join("a@x.com", "2026-11-01");
    expect(await service.offerSpot(slot(5))).toEqual([]);
    expect(sendOfferEmail).not.toHaveBeenCalled();
  });

  it("does not offer a slot that was already rebooked", async () => {
    await join("a@x.com");
    fake.setBooked(["someone@x.com"]);
    expect(await service.offerSpot(freedSlot())).toEqual([]);
  });

  it("rolls back a failed offer so the retry goes to the same person, not the next one", async () => {
    await join("first@x.com");
    await join("second@x.com");
    sendOfferEmail.mockRejectedValueOnce(new Error("smtp down"));

    await expect(service.offerSpot(freedSlot())).rejects.toThrow("smtp down");
    expect(fake.rows.map((r) => r.status)).toEqual([WaitlistStatus.WAITING, WaitlistStatus.WAITING]);
    expect(fake.holds).toEqual([]);

    expect(await service.offerSpot(freedSlot())).toEqual([1]);
    expect(fake.rows[1].status).toBe(WaitlistStatus.WAITING);
  });

  it("never offers the same slot to two people when offers run concurrently", async () => {
    await join("first@x.com");
    await join("second@x.com");

    const results = await Promise.all([service.offerSpot(freedSlot()), service.offerSpot(freedSlot())]);

    expect(results.flat()).toEqual([1]);
    expect(fake.rows[1].status).toBe(WaitlistStatus.WAITING);
  });

  it("ignores an expiry task left over from a rolled-back offer", async () => {
    await join("first@x.com");
    await join("second@x.com");
    await service.offerSpot(freedSlot());
    fake.rows[0].offerExpiresAt = new Date(NOW + 7 * HOUR);

    await expireAfterWindow(1);

    expect(fake.rows[0].status).toBe(WaitlistStatus.OFFERED);
  });

  it("passes an expired, unclaimed offer to the next person", async () => {
    await join("first@x.com");
    await join("second@x.com");
    await service.offerSpot(freedSlot());

    await expireAfterWindow(1);

    expect(fake.rows[0].status).toBe(WaitlistStatus.EXPIRED);
    expect(fake.rows[1].status).toBe(WaitlistStatus.OFFERED);
    expect(fake.holds.map((h) => h.uid)).toEqual(["uid-2"]);
  });

  it("marks the offer claimed when the waitlister booked it", async () => {
    await join("first@x.com");
    await join("second@x.com");
    await service.offerSpot(freedSlot());
    fake.setBooked(["first@x.com"]);

    await expireAfterWindow(1);

    expect(fake.rows[0].status).toBe(WaitlistStatus.CLAIMED);
    expect(fake.rows[1].status).toBe(WaitlistStatus.WAITING);
  });

  it("leaving with a live offer releases the hold and offers it to the next person", async () => {
    await join("first@x.com");
    await join("second@x.com");
    await service.offerSpot(freedSlot());

    expect(await service.leave("uid-1")).toBe(true);

    expect(fake.rows[0].status).toBe(WaitlistStatus.LEFT);
    expect(fake.rows[1].status).toBe(WaitlistStatus.OFFERED);
    expect(fake.holds.map((h) => h.uid)).toEqual(["uid-2"]);
    expect(await service.leave("uid-1")).toBe(false);
  });

  it("builds a claim URL with the held slot preselected only while the offer is live", async () => {
    await join("first@x.com");
    expect(await service.getClaimUrl("uid-1")).toBeNull();

    await service.offerSpot(freedSlot());
    const url = new URL((await service.getClaimUrl("uid-1")) ?? "");
    expect(url.pathname).toBe("/host/intro");
    expect(url.searchParams.get("date")).toBe("2026-11-03");
    expect(url.searchParams.get("slot")).toBe(freedSlot().start.toISOString());
  });

  it("offers a slot starting exactly 6 hours from now, since only closer slots are excluded", async () => {
    await join("a@x.com", "2026-11-01");
    expect(await service.offerSpot(slot(6))).toEqual([1]);
  });

  it("does not offer a slot of an event type that no longer exists", async () => {
    await join("a@x.com");
    expect(await service.offerSpot({ ...freedSlot(), eventTypeId: 2 })).toEqual([]);
    expect(fake.rows[0].status).toBe(WaitlistStatus.WAITING);
  });

  it("reports no booked times for an unknown event type instead of failing", async () => {
    await expect(
      service.getBookedTimes({ eventTypeId: 2, from: new Date(NOW), to: new Date(NOW + 48 * HOUR) })
    ).resolves.toEqual([]);
  });

  it("expires an offer whose event type was deleted during the hold, without offering it again", async () => {
    await join("first@x.com");
    await join("second@x.com");
    await service.offerSpot(freedSlot());
    fake.deleteEventType();

    await expireAfterWindow(1);

    expect(fake.rows[0].status).toBe(WaitlistStatus.EXPIRED);
    expect(fake.rows[1].status).toBe(WaitlistStatus.WAITING);
    expect(fake.holds).toEqual([]);
  });

  describe("seated events", () => {
    beforeEach(() => fake.setSeats(3));

    const joinAt = (email: string, hours: number) =>
      service.join({
        eventTypeId: 1,
        name: email,
        email,
        timeZone: "UTC",
        date: "2026-11-03",
        slotStart: slot(hours).start,
      });

    it("reports only times with every seat booked", async () => {
      fake.attendeeCounts.push(
        { startTime: slot(10).start, attendees: 3 },
        { startTime: slot(11).start, attendees: 2 }
      );
      const times = await service.getBookedTimes({
        eventTypeId: 1,
        from: new Date(NOW),
        to: new Date(NOW + 48 * HOUR),
      });
      expect(times).toEqual([slot(10).start]);
    });

    it("rejects joining a specific time that still has seats, and accepts it once full", async () => {
      fake.setBooked(["a@x.com", "b@x.com"]);
      await expect(joinAt("c@x.com", 46)).rejects.toThrow("seats available");

      fake.setBooked(["a@x.com", "b@x.com", "d@x.com"]);
      await expect(joinAt("c@x.com", 46)).resolves.toMatchObject({ status: WaitlistStatus.WAITING });
    });

    it("judges a time full by the bookings at that time, not at other times", async () => {
      fake.setBooked([]);
      fake.setBookedAt(slot(46).start, ["a@x.com", "b@x.com", "d@x.com"]);
      await expect(joinAt("c@x.com", 46)).resolves.toMatchObject({ status: WaitlistStatus.WAITING });
    });

    it("rejects joining a seated time that has no bookings yet", async () => {
      fake.setBooked(null);
      await expect(joinAt("c@x.com", 46)).rejects.toThrow("seats available");
    });

    it("offers nothing when the freed time is full, even if other times have open seats", async () => {
      await join("first@x.com");
      fake.setBooked([]);
      fake.setBookedAt(freedSlot().start, ["a@x.com", "b@x.com", "c@x.com"]);
      expect(await service.offerSpot(freedSlot())).toEqual([]);
    });

    it("offers every seat when the whole seated booking was cancelled", async () => {
      fake.setSeats(2);
      await join("first@x.com");
      await join("second@x.com");
      await join("third@x.com");
      fake.setBooked(null);

      expect(await service.offerSpot(freedSlot())).toEqual([1, 2]);
      expect(fake.rows[2].status).toBe(WaitlistStatus.WAITING);
    });

    it("offers a freed seat while other attendees stay booked, holding exactly one seat", async () => {
      await join("first@x.com");
      await join("second@x.com");
      fake.setBooked(["a@x.com", "b@x.com"]);

      expect(await service.offerSpot(freedSlot())).toEqual([1]);
      expect(fake.rows[1].status).toBe(WaitlistStatus.WAITING);
      expect(fake.holds).toEqual([
        { uid: "uid-1", releaseAt: new Date(NOW + WAITLIST_CLAIM_WINDOW_MS), isSeat: true },
      ]);
    });

    it("offers every open seat, oldest waiter first", async () => {
      await join("first@x.com");
      await join("second@x.com");
      await join("third@x.com");
      fake.setBooked(["a@x.com"]);

      expect(await service.offerSpot(freedSlot())).toEqual([1, 2]);
      expect(fake.rows.map((r) => r.status)).toEqual([
        WaitlistStatus.OFFERED,
        WaitlistStatus.OFFERED,
        WaitlistStatus.WAITING,
      ]);
    });

    it("counts live offers against capacity, and claimed offers only as bookings", async () => {
      await join("first@x.com");
      await join("second@x.com");
      await join("third@x.com");
      fake.setBooked(["a@x.com", "b@x.com"]);
      await service.offerSpot(freedSlot());

      // 3 seats, 1 booked, 1 live offer: one more seat to offer
      fake.setBooked(["a@x.com"]);
      expect(await service.offerSpot(freedSlot())).toEqual([2]);

      // first@ claims: 2 booked (incl. first@), 1 live offer (second@), no seat left
      fake.setBooked(["a@x.com", "first@x.com"]);
      expect(await service.offerSpot(freedSlot())).toEqual([]);

      // second@ leaves: their seat goes to third@
      await service.leave("uid-2");
      expect(fake.rows[2].status).toBe(WaitlistStatus.OFFERED);
    });

    it("does not offer when no seat is open", async () => {
      await join("first@x.com");
      fake.setBooked(["a@x.com", "b@x.com", "c@x.com"]);
      expect(await service.offerSpot(freedSlot())).toEqual([]);
    });

    it("marks an expired offer claimed when the waitlister booked a seat", async () => {
      await join("first@x.com");
      await join("second@x.com");
      fake.setBooked(["a@x.com", "b@x.com"]);
      await service.offerSpot(freedSlot());

      fake.setBooked(["a@x.com", "b@x.com", "first@x.com"]);
      await expireAfterWindow(1);
      expect(fake.rows[0].status).toBe(WaitlistStatus.CLAIMED);
    });

    it("returns an expired offer to waiting when someone else filled the seat", async () => {
      await join("first@x.com");
      await join("second@x.com");
      fake.setBooked(["a@x.com", "b@x.com"]);
      await service.offerSpot(freedSlot());

      fake.setBooked(["a@x.com", "b@x.com", "walkin@x.com"]);
      await expireAfterWindow(1);
      expect(fake.rows[0].status).toBe(WaitlistStatus.WAITING);
      expect(fake.rows[1].status).toBe(WaitlistStatus.WAITING);
    });

    it("passes an expired seat on to the next person when it is still open", async () => {
      await join("first@x.com");
      await join("second@x.com");
      fake.setBooked(["a@x.com", "b@x.com"]);
      await service.offerSpot(freedSlot());

      await expireAfterWindow(1);
      expect(fake.rows[0].status).toBe(WaitlistStatus.EXPIRED);
      expect(fake.rows[1].status).toBe(WaitlistStatus.OFFERED);
      expect(fake.holds.map((h) => h.uid)).toEqual(["uid-2"]);
    });

    it("releases the claimant's hold only after they book the offered time of the offered event", async () => {
      await join("first@x.com");
      fake.setBooked(["a@x.com", "b@x.com"]);
      await service.offerSpot(freedSlot());

      await service.releaseHoldAfterBooking({ uid: "uid-1", eventTypeId: 1, start: slot(47).start });
      await service.releaseHoldAfterBooking({ uid: "uid-x", eventTypeId: 1, start: freedSlot().start });
      await service.releaseHoldAfterBooking({ uid: "uid-1", eventTypeId: 2, start: freedSlot().start });
      expect(fake.holds).toHaveLength(1);

      await service.releaseHoldAfterBooking({ uid: "uid-1", eventTypeId: 1, start: freedSlot().start });
      expect(fake.holds).toEqual([]);
    });
  });

  describe("when the host turns the waitlist off", () => {
    const range = { eventTypeId: 1, from: new Date(NOW), to: new Date(NOW + 48 * HOUR) };
    const { WAITING, OFFERED, EXPIRED, LEFT } = WaitlistStatus;

    it("rejects joining with Forbidden and adds no entry, and accepts joining once turned back on", async () => {
      fake.setWaitlistDisabled(true);
      // API callers only see the message, so it has to say why they were refused
      await expect(join("a@x.com")).rejects.toMatchObject({
        code: ErrorCode.Forbidden,
        message: "The waitlist is turned off for event type 1",
      });
      expect(fake.rows).toEqual([]);

      fake.setWaitlistDisabled(false);
      await expect(join("a@x.com")).resolves.toBeTruthy();
      expect(fake.rows).toHaveLength(1);
    });

    it("only affects the event type it was turned off for", async () => {
      fake.bookedTimes.push(new Date(NOW + 8 * HOUR));
      await join("first@x.com");
      await service.join({
        eventTypeId: 3,
        name: "o",
        email: "o@x.com",
        timeZone: "UTC",
        date: "2026-11-03",
      });
      fake.setWaitlistDisabled(true, 1);

      await expect(join("second@x.com")).rejects.toMatchObject({ code: ErrorCode.Forbidden });
      await expect(
        service.join({ eventTypeId: 3, name: "p", email: "p@x.com", timeZone: "UTC", date: "2026-11-03" })
      ).resolves.toMatchObject({ eventTypeId: 3 });
      expect(await service.getBookedTimes(range)).toEqual([]);
      expect(await service.getBookedTimes({ ...range, eventTypeId: 3 })).toEqual([new Date(NOW + 8 * HOUR)]);
      expect(await service.offerSpot(freedSlot())).toEqual([]);
      expect(await service.offerSpot({ ...freedSlot(), eventTypeId: 3 })).toEqual([2]);
    });

    it("reports no booked times, so the booking page shows no waitlist options, until turned back on", async () => {
      fake.bookedTimes.push(new Date(NOW + 8 * HOUR));
      fake.setWaitlistDisabled(true);
      expect(await service.getBookedTimes(range)).toEqual([]);

      fake.setWaitlistDisabled(false);
      expect(await service.getBookedTimes(range)).toEqual([new Date(NOW + 8 * HOUR)]);
    });

    it("makes no offer, hold or email for a freed slot, and keeps everyone waiting in the queue", async () => {
      await join("first@x.com");
      await join("second@x.com");
      fake.setWaitlistDisabled(true);

      expect(await service.offerSpot(freedSlot())).toEqual([]);

      expect(fake.rows.map((r) => r.status)).toEqual([WAITING, WAITING]);
      expect(fake.holds).toEqual([]);
      expect(scheduleOfferExpiry).not.toHaveBeenCalled();
      expect(sendOfferEmail).not.toHaveBeenCalled();
    });

    it("keeps an offer made before it was turned off claimable, with its hold", async () => {
      await join("first@x.com");
      await service.offerSpot(freedSlot());
      fake.setWaitlistDisabled(true);

      expect(fake.rows[0].status).toBe(OFFERED);
      expect(fake.holds.map((h) => h.uid)).toEqual(["uid-1"]);
      expect(await service.getClaimUrl("uid-1")).toMatch(/^https:\/\/app\.test\/host\/intro\?/);

      await service.releaseHoldAfterBooking({ uid: "uid-1", eventTypeId: 1, start: freedSlot().start });
      expect(fake.holds).toEqual([]);
    });

    it("does not pass an expired offer on to the next person", async () => {
      await join("first@x.com");
      await join("second@x.com");
      await service.offerSpot(freedSlot());
      fake.setWaitlistDisabled(true);
      sendOfferEmail.mockClear();

      await expireAfterWindow(1);

      expect(fake.rows.map((r) => r.status)).toEqual([EXPIRED, WAITING]);
      expect(fake.holds).toEqual([]);
      expect(sendOfferEmail).not.toHaveBeenCalled();
    });

    it("still lets people leave, without offering a released spot to the next person", async () => {
      await join("first@x.com");
      await join("second@x.com");
      await service.offerSpot(freedSlot());
      fake.setWaitlistDisabled(true);

      expect(await service.leave("uid-1")).toBe(true);
      expect(fake.rows.map((r) => r.status)).toEqual([LEFT, WAITING]);
      expect(fake.holds).toEqual([]);

      expect(await service.leave("uid-2")).toBe(true);
      expect(fake.rows[1].status).toBe(LEFT);
    });

    it("offers the next freed slot to people who stayed waiting once turned back on", async () => {
      await join("first@x.com");
      fake.setWaitlistDisabled(true);
      expect(await service.offerSpot(freedSlot())).toEqual([]);

      fake.setWaitlistDisabled(false);
      expect(await service.offerSpot(slot(47))).toEqual([1]);
      expect(fake.rows[0]).toMatchObject({ status: OFFERED, offerStart: slot(47).start });
      expect(fake.holds.map((h) => h.uid)).toEqual(["uid-1"]);
    });

    describe("on a seated event", () => {
      beforeEach(() => fake.setSeats(3));

      it("reports no full times until turned back on", async () => {
        fake.attendeeCounts.push({ startTime: slot(10).start, attendees: 3 });
        fake.setWaitlistDisabled(true);
        expect(await service.getBookedTimes(range)).toEqual([]);

        fake.setWaitlistDisabled(false);
        expect(await service.getBookedTimes(range)).toEqual([slot(10).start]);
      });

      it("rejects joining a full time with Forbidden", async () => {
        fake.setBooked(["a@x.com", "b@x.com", "c@x.com"]);
        fake.setWaitlistDisabled(true);

        await expect(
          service.join({
            eventTypeId: 1,
            name: "d",
            email: "d@x.com",
            timeZone: "UTC",
            date: "2026-11-03",
            slotStart: freedSlot().start,
          })
        ).rejects.toMatchObject({ code: ErrorCode.Forbidden });
        expect(fake.rows).toEqual([]);
      });

      it("offers no seat freed by one attendee cancelling while others stay booked", async () => {
        await join("first@x.com");
        fake.setBooked(["a@x.com", "b@x.com"]);
        fake.setWaitlistDisabled(true);

        expect(await service.offerSpot(freedSlot())).toEqual([]);
        expect(fake.rows[0].status).toBe(WAITING);
        expect(fake.holds).toEqual([]);
      });
    });
  });
});
