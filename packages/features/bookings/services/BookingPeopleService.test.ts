import { BookingStatus } from "@calcom/prisma/enums";
import { describe, expect, it, vi } from "vitest";
import type { AttendeeRepository } from "../repositories/AttendeeRepository";
import { BookingPeopleService } from "./BookingPeopleService";

type AttendeeRow = Awaited<
  ReturnType<AttendeeRepository["findByBookingUserIdIncludeBookingEventType"]>
>[number];

function row({
  name,
  email,
  endTime,
  slug = "30min",
  teamSlug = null,
}: {
  name: string;
  email: string;
  endTime: string;
  slug?: string;
  teamSlug?: string | null;
}): AttendeeRow {
  return {
    name,
    email,
    booking: {
      endTime: new Date(endTime),
      eventType: { slug, team: teamSlug ? { slug: teamSlug } : null },
    },
  };
}

function setup(rows: AttendeeRow[]) {
  const attendeeRepository = {
    findByBookingUserIdIncludeBookingEventType: vi.fn().mockResolvedValue(rows),
  } as unknown as AttendeeRepository;
  const service = new BookingPeopleService({ attendeeRepository });
  return { service, attendeeRepository };
}

const now = new Date("2026-10-08T12:00:00Z");
const organizer = { userId: 1, userEmail: "host@example.com", now };

describe("BookingPeopleService", () => {
  describe("listPeopleMet", () => {
    it("only asks for accepted bookings that have already ended", async () => {
      const { service, attendeeRepository } = setup([]);

      await service.listPeopleMet(organizer);

      expect(attendeeRepository.findByBookingUserIdIncludeBookingEventType).toHaveBeenCalledWith({
        userId: 1,
        bookingStatus: BookingStatus.ACCEPTED,
        bookingEndTimeBefore: now,
      });
    });

    it("returns an empty list when there are no previous attendees", async () => {
      const { service } = setup([]);

      await expect(service.listPeopleMet(organizer)).resolves.toEqual([]);
    });

    it("lists each attendee once with their meeting count and most recent meeting", async () => {
      const { service } = setup([
        row({ name: "Ana", email: "ana@example.com", endTime: "2026-10-01T10:30:00Z", slug: "1on1" }),
        row({ name: "Ben", email: "ben@example.com", endTime: "2026-09-20T10:30:00Z" }),
        row({ name: "Ana", email: "ana@example.com", endTime: "2026-09-01T10:30:00Z", slug: "intro" }),
        row({ name: "Ana", email: "ana@example.com", endTime: "2026-08-01T10:30:00Z", slug: "intro" }),
      ]);

      const people = await service.listPeopleMet(organizer);

      expect(people).toEqual([
        {
          name: "Ana",
          email: "ana@example.com",
          meetingCount: 3,
          lastMeetingAt: new Date("2026-10-01T10:30:00Z"),
          lastEventType: { slug: "1on1", teamSlug: null },
        },
        {
          name: "Ben",
          email: "ben@example.com",
          meetingCount: 1,
          lastMeetingAt: new Date("2026-09-20T10:30:00Z"),
          lastEventType: { slug: "30min", teamSlug: null },
        },
      ]);
    });

    it("treats emails that differ only in case as the same person", async () => {
      const { service } = setup([
        row({ name: "Ana Lopez", email: "Ana@Example.com", endTime: "2026-10-01T10:30:00Z" }),
        row({ name: "Ana", email: "ana@example.com", endTime: "2026-09-01T10:30:00Z" }),
      ]);

      const people = await service.listPeopleMet(organizer);

      expect(people).toHaveLength(1);
      expect(people[0]).toMatchObject({ name: "Ana Lopez", email: "Ana@Example.com", meetingCount: 2 });
    });

    it("leaves out the organizer when they are also listed as an attendee", async () => {
      const { service } = setup([
        row({ name: "Host", email: "HOST@example.com", endTime: "2026-10-01T10:30:00Z" }),
        row({ name: "Ana", email: "ana@example.com", endTime: "2026-10-01T10:30:00Z" }),
      ]);

      const people = await service.listPeopleMet(organizer);

      expect(people.map((person) => person.email)).toEqual(["ana@example.com"]);
    });

    it("keeps the team slug of the most recent event type for team bookings", async () => {
      const { service } = setup([
        row({ name: "Ana", email: "ana@example.com", endTime: "2026-10-01T10:30:00Z", teamSlug: "sales" }),
      ]);

      const [person] = await service.listPeopleMet(organizer);

      expect(person.lastEventType).toEqual({ slug: "30min", teamSlug: "sales" });
    });

    it("returns a null event type when the last booking's event type was deleted", async () => {
      const { service } = setup([
        {
          name: "Ana",
          email: "ana@example.com",
          booking: { endTime: new Date("2026-10-01T10:30:00Z"), eventType: null },
        },
      ]);

      const [person] = await service.listPeopleMet(organizer);

      expect(person.lastEventType).toBeNull();
    });

    it("skips attendees that are no longer attached to a booking", async () => {
      const { service } = setup([{ name: "Ana", email: "ana@example.com", booking: null }]);

      await expect(service.listPeopleMet(organizer)).resolves.toEqual([]);
    });
  });
});
