import { WaitlistStatus } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WaitlistEntryDto, WaitlistRepository } from "../repositories/WaitlistRepository";
import { WAITLIST_CLAIM_WINDOW_MS, WaitlistService } from "./WaitlistService";

const HOUR = 60 * 60 * 1000;
const NOW = Date.parse("2026-11-01T12:00:00Z");

type Row = WaitlistEntryDto & { dayStart: Date; dayEnd: Date; slotStart: Date | null; createdAt: number };

function makeFakeRepo() {
  const rows: Row[] = [];
  const holds: { uid: string; releaseAt: Date }[] = [];
  let bookedEmails: string[] | null = null;
  const bookedTimes: Date[] = [];
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
      id === 1
        ? {
            id: 1,
            title: "Intro call",
            slug: "intro",
            length: 30,
            team: null,
            owner: { username: "host" },
            users: [],
          }
        : null,
    createSlotHold: async (h: { uid: string; releaseAt: Date }) => {
      holds.push({ uid: h.uid, releaseAt: h.releaseAt });
    },
    deleteSlotHolds: async (uid: string) => {
      for (let i = holds.length - 1; i >= 0; i--) if (holds[i].uid === uid) holds.splice(i, 1);
    },
    findActiveBookingAttendeeEmailsAt: async () => bookedEmails,
    findActiveBookingStartTimes: async (q: { from: Date; to: Date }) =>
      bookedTimes.filter((t) => t >= q.from && t < q.to),
  };
  return {
    repo: repo as unknown as WaitlistRepository,
    rows,
    holds,
    bookedTimes,
    setBooked: (emails: string[] | null) => {
      bookedEmails = emails;
    },
  };
}
type Offer = { hostUserId: number; offerStart: Date; offerEnd: Date; offerExpiresAt: Date };

describe("WaitlistService", () => {
  let fake: ReturnType<typeof makeFakeRepo>;
  let service: WaitlistService;
  const scheduleOfferExpiry = vi.fn();
  const sendOfferEmail = vi.fn();

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
    scheduleOfferExpiry.mockReset();
    sendOfferEmail.mockReset();
    service = new WaitlistService({
      waitlistRepo: fake.repo,
      webappUrl: "https://app.test",
      scheduleOfferExpiry,
      sendOfferEmail,
      now: () => NOW,
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
    expect(await service.offerSpot(freedSlot())).toBeNull();
    expect(await service.offerSpot(slot(47))).toBe(1);
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

    const id = await service.offerSpot(freedSlot());

    expect(id).toBe(1);
    expect(fake.rows[0].status).toBe(WaitlistStatus.OFFERED);
    expect(fake.rows[1].status).toBe(WaitlistStatus.WAITING);
    const expiresAt = new Date(NOW + WAITLIST_CLAIM_WINDOW_MS);
    expect(fake.holds).toEqual([{ uid: "uid-1", releaseAt: expiresAt }]);
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
    expect(await service.offerSpot(slot(5))).toBeNull();
    expect(sendOfferEmail).not.toHaveBeenCalled();
  });

  it("does not offer a slot that was already rebooked", async () => {
    await join("a@x.com");
    fake.setBooked(["someone@x.com"]);
    expect(await service.offerSpot(freedSlot())).toBeNull();
  });

  it("passes an expired, unclaimed offer to the next person", async () => {
    await join("first@x.com");
    await join("second@x.com");
    await service.offerSpot(freedSlot());

    await service.expireOffer(1);

    expect(fake.rows[0].status).toBe(WaitlistStatus.EXPIRED);
    expect(fake.rows[1].status).toBe(WaitlistStatus.OFFERED);
    expect(fake.holds.map((h) => h.uid)).toEqual(["uid-2"]);
  });

  it("marks the offer claimed when the waitlister booked it", async () => {
    await join("first@x.com");
    await join("second@x.com");
    await service.offerSpot(freedSlot());
    fake.setBooked(["first@x.com"]);

    await service.expireOffer(1);

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
});
