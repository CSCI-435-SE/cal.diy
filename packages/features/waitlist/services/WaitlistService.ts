import dayjs from "@calcom/dayjs";
import { ErrorWithCode } from "@calcom/lib/errors";
import { WaitlistStatus } from "@calcom/prisma/enums";
import type { WaitlistEntryDto, WaitlistRepository } from "../repositories/WaitlistRepository";

type FreedSlot = { eventTypeId: number; hostUserId: number; start: Date; end: Date };

export const WAITLIST_CLAIM_WINDOW_MS = 6 * 60 * 60 * 1000;

export type WaitlistOfferEmailData = {
  name: string;
  email: string;
  timeZone: string;
  eventTitle: string;
  offerStart: Date;
  offerExpiresAt: Date;
  claimUrl: string;
  leaveUrl: string;
};

export interface IWaitlistServiceDeps {
  waitlistRepo: WaitlistRepository;
  webappUrl: string;
  scheduleOfferExpiry: (entryId: number, at: Date) => Promise<unknown>;
  sendOfferEmail: (data: WaitlistOfferEmailData) => Promise<unknown>;
  now?: () => number;
}

export class WaitlistService {
  constructor(private deps: IWaitlistServiceDeps) {}

  private now() {
    return this.deps.now ? this.deps.now() : Date.now();
  }

  /** `date` is YYYY-MM-DD in the booker's `timeZone`; `slotStart` narrows the entry to one specific time. */
  async join(input: {
    eventTypeId: number;
    name: string;
    email: string;
    timeZone: string;
    date: string;
    slotStart?: Date;
  }) {
    const dayStart = dayjs.tz(input.date, input.timeZone).startOf("day");
    const dayEnd = dayStart.add(1, "day");
    const slotStart = input.slotStart ?? null;
    if (slotStart && (slotStart < dayStart.toDate() || slotStart >= dayEnd.toDate())) {
      throw ErrorWithCode.Factory.BadRequest("Waitlist time must fall on the selected day");
    }
    const latestStart = slotStart ? slotStart.getTime() : dayEnd.valueOf();
    if (latestStart - this.now() <= WAITLIST_CLAIM_WINDOW_MS) {
      throw ErrorWithCode.Factory.BadRequest("Waitlist is not available less than 6 hours in advance");
    }

    const eventType = await this.deps.waitlistRepo.findEventTypeForWaitlist(input.eventTypeId);
    if (!eventType) throw ErrorWithCode.Factory.NotFound(`Event type ${input.eventTypeId} not found`);
    if (slotStart && eventType.seatsPerTimeSlot) {
      const bookedEmails = await this.deps.waitlistRepo.findActiveBookingAttendeeEmailsAt({
        eventTypeId: input.eventTypeId,
        startTime: slotStart,
      });
      if ((bookedEmails?.length ?? 0) < eventType.seatsPerTimeSlot) {
        throw ErrorWithCode.Factory.BadRequest("This time still has seats available");
      }
    }

    const email = input.email.toLowerCase();
    const existing = await this.deps.waitlistRepo.findWaitingByEmailAndDay({
      eventTypeId: input.eventTypeId,
      email,
      dayStart: dayStart.toDate(),
      slotStart,
    });
    if (existing) return existing;

    return this.deps.waitlistRepo.create({
      eventTypeId: input.eventTypeId,
      name: input.name,
      email,
      timeZone: input.timeZone,
      dayStart: dayStart.toDate(),
      dayEnd: dayEnd.toDate(),
      slotStart,
    });
  }

  /**
   * Start times of this event type's bookings that could still be waitlisted (more than 6 hours away).
   * For seated events, only times with every seat booked.
   */
  async getBookedTimes(input: { eventTypeId: number; from: Date; to: Date }): Promise<Date[]> {
    const earliest = new Date(this.now() + WAITLIST_CLAIM_WINDOW_MS);
    const from = input.from > earliest ? input.from : earliest;
    if (from >= input.to) return [];
    const range = { eventTypeId: input.eventTypeId, from, to: input.to };
    const repo = this.deps.waitlistRepo;
    const seats = (await repo.findEventTypeForWaitlist(input.eventTypeId))?.seatsPerTimeSlot;
    if (!seats) return repo.findActiveBookingStartTimes(range);

    const attendeesByTime = new Map<number, number>();
    for (const { startTime, attendees } of await repo.findActiveBookingAttendeeCounts(range)) {
      attendeesByTime.set(startTime.getTime(), (attendeesByTime.get(startTime.getTime()) ?? 0) + attendees);
    }
    return [...attendeesByTime]
      .filter(([, attendees]) => attendees >= seats)
      .map(([time]) => new Date(time));
  }

  /**
   * Seats at `time` not taken by a booking or a live offer. A non-seated event is one seat, taken by any booking.
   * Offers whose waitlister already booked are counted only as bookings.
   */
  private async countOpenSeats(eventTypeId: number, time: Date, seatsPerTimeSlot: number | null) {
    const repo = this.deps.waitlistRepo;
    const bookedEmails = await repo.findActiveBookingAttendeeEmailsAt({ eventTypeId, startTime: time });
    const booked = new Set(bookedEmails ?? []);
    const bookedSeats = seatsPerTimeSlot ? (bookedEmails?.length ?? 0) : bookedEmails ? 1 : 0;
    const offers = await repo.findOfferedForTime({ eventTypeId, time });
    const now = this.now();
    const liveOffers = offers.filter(
      (offer) =>
        !!offer.offerExpiresAt &&
        offer.offerExpiresAt.getTime() > now &&
        !booked.has(offer.email.toLowerCase())
    ).length;
    return { open: (seatsPerTimeSlot ?? 1) - bookedSeats - liveOffers, booked };
  }

  /** Offers each open seat of a freed slot to the longest-waiting people for it and holds one seat per offer. */
  async offerSpot(slot: FreedSlot): Promise<number[]> {
    const now = this.now();
    // A slot starting within the claim window can't be held for the full 6 hours, so it isn't offered
    if (slot.start.getTime() - now < WAITLIST_CLAIM_WINDOW_MS) return [];

    const repo = this.deps.waitlistRepo;
    const eventType = await repo.findEventTypeForWaitlist(slot.eventTypeId);
    if (!eventType) return [];
    const seatsPerTimeSlot = eventType.seatsPerTimeSlot;

    const offered: number[] = [];
    // Recounted every round, so concurrent runs for one slot can't offer more seats than are open
    while ((await this.countOpenSeats(slot.eventTypeId, slot.start, seatsPerTimeSlot)).open > 0) {
      const entry = await repo.findOldestWaitingForTime({ eventTypeId: slot.eventTypeId, time: slot.start });
      if (!entry) break;

      const offerExpiresAt = new Date(now + WAITLIST_CLAIM_WINDOW_MS);
      const won = await repo.transition(entry.id, WaitlistStatus.WAITING, WaitlistStatus.OFFERED, {
        hostUserId: slot.hostUserId,
        offerStart: slot.start,
        offerEnd: slot.end,
        offerExpiresAt,
      });
      // Another offer grabbed this entry concurrently; give the seat to the next person instead
      if (!won) continue;

      try {
        await repo.createSlotHold({
          uid: entry.uid,
          eventTypeId: slot.eventTypeId,
          userId: slot.hostUserId,
          start: slot.start,
          end: slot.end,
          releaseAt: offerExpiresAt,
          isSeat: !!seatsPerTimeSlot,
        });
        await this.deps.scheduleOfferExpiry(entry.id, offerExpiresAt);
        await this.deps.sendOfferEmail({
          name: entry.name,
          email: entry.email,
          timeZone: entry.timeZone,
          eventTitle: eventType.title,
          offerStart: slot.start,
          offerExpiresAt,
          claimUrl: `${this.deps.webappUrl}/api/waitlist/claim?uid=${entry.uid}`,
          leaveUrl: `${this.deps.webappUrl}/api/waitlist/leave?uid=${entry.uid}`,
        });
      } catch (error) {
        // Undo the offer so the task's retry offers the seat to this same person instead of the next one
        await repo.deleteSlotHolds(entry.uid);
        await repo.transition(entry.id, WaitlistStatus.OFFERED, WaitlistStatus.WAITING, null);
        throw error;
      }
      offered.push(entry.id);
    }
    return offered;
  }

  async expireOffer(entryId: number) {
    const repo = this.deps.waitlistRepo;
    const entry = await repo.findById(entryId);
    if (!entry || entry.status !== WaitlistStatus.OFFERED || !entry.offerStart) return;
    // Left over from an offer attempt that was rolled back and re-made later
    if (entry.offerExpiresAt && entry.offerExpiresAt.getTime() > this.now()) return;

    await repo.deleteSlotHolds(entry.uid);
    const eventType = await repo.findEventTypeForWaitlist(entry.eventTypeId);
    const { open, booked } = await this.countOpenSeats(
      entry.eventTypeId,
      entry.offerStart,
      eventType?.seatsPerTimeSlot ?? null
    );
    if (booked.has(entry.email.toLowerCase())) {
      await repo.transition(entry.id, WaitlistStatus.OFFERED, WaitlistStatus.CLAIMED);
      return;
    }
    if (open <= 0) {
      // Someone else took the seat during the hold: the waitlister keeps their place
      await repo.transition(entry.id, WaitlistStatus.OFFERED, WaitlistStatus.WAITING, null);
      return;
    }

    if (await repo.transition(entry.id, WaitlistStatus.OFFERED, WaitlistStatus.EXPIRED)) {
      await this.offerToNext(entry);
    }
  }

  /** Frees the hold of the offer the booker claimed via `uid`, so the booked seat isn't counted twice. */
  async releaseHoldAfterBooking(input: { uid: string; eventTypeId: number; start: Date }) {
    const entry = await this.deps.waitlistRepo.findByUid(input.uid);
    if (
      entry?.status !== WaitlistStatus.OFFERED ||
      entry.eventTypeId !== input.eventTypeId ||
      entry.offerStart?.getTime() !== input.start.getTime()
    ) {
      return;
    }
    await this.deps.waitlistRepo.deleteSlotHolds(entry.uid);
  }

  /** Returns false if the entry is unknown or already finished. */
  async leave(uid: string): Promise<boolean> {
    const repo = this.deps.waitlistRepo;
    const entry = await repo.findByUid(uid);
    if (!entry) return false;

    if (entry.status === WaitlistStatus.WAITING) {
      return repo.transition(entry.id, WaitlistStatus.WAITING, WaitlistStatus.LEFT);
    }
    if (entry.status !== WaitlistStatus.OFFERED) return false;
    if (!(await repo.transition(entry.id, WaitlistStatus.OFFERED, WaitlistStatus.LEFT))) return false;

    await repo.deleteSlotHolds(entry.uid);
    await this.offerToNext(entry);
    return true;
  }

  /** Booking page URL with the held slot preselected, or null when there is no live offer. */
  async getClaimUrl(uid: string): Promise<string | null> {
    const repo = this.deps.waitlistRepo;
    const entry = await repo.findByUid(uid);
    if (
      !entry ||
      entry.status !== WaitlistStatus.OFFERED ||
      !entry.offerStart ||
      !entry.offerExpiresAt ||
      entry.offerExpiresAt.getTime() <= this.now()
    ) {
      return null;
    }

    const eventType = await repo.findEventTypeForWaitlist(entry.eventTypeId);
    if (!eventType) return null;
    const owner = eventType.team?.slug
      ? `team/${eventType.team.slug}`
      : (eventType.owner?.username ?? eventType.users[0]?.username);
    if (!owner) return null;

    const localStart = dayjs(entry.offerStart).tz(entry.timeZone);
    const params = new URLSearchParams({
      month: localStart.format("YYYY-MM"),
      date: localStart.format("YYYY-MM-DD"),
      slot: entry.offerStart.toISOString(),
      name: entry.name,
      email: entry.email,
    });
    return `${this.deps.webappUrl}/${owner}/${eventType.slug}?${params.toString()}`;
  }

  private async offerToNext(entry: WaitlistEntryDto) {
    if (!entry.hostUserId || !entry.offerStart || !entry.offerEnd) return;
    await this.offerSpot({
      eventTypeId: entry.eventTypeId,
      hostUserId: entry.hostUserId,
      start: entry.offerStart,
      end: entry.offerEnd,
    });
  }
}
