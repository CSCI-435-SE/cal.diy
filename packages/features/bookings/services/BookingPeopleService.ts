import { BookingStatus } from "@calcom/prisma/enums";
import type { AttendeeRepository } from "../repositories/AttendeeRepository";

export interface IBookingPeopleServiceDeps {
  attendeeRepository: AttendeeRepository;
}

export type BookingPersonDto = {
  name: string;
  email: string;
  meetingCount: number;
  lastMeetingAt: Date;
  // Event type of the most recent meeting, so "Book again" reopens the flow they last used
  lastEventType: { slug: string; teamSlug: string | null } | null;
};

export class BookingPeopleService {
  constructor(private readonly deps: IBookingPeopleServiceDeps) {}

  async listPeopleMet({
    userId,
    userEmail,
    now = new Date(),
  }: {
    userId: number;
    userEmail: string;
    now?: Date;
  }): Promise<BookingPersonDto[]> {
    // Only accepted bookings that already ended count as having "met" someone;
    // cancelled, rejected and still-pending bookings never happened
    const attendees = await this.deps.attendeeRepository.findByBookingUserIdIncludeBookingEventType({
      userId,
      bookingStatus: BookingStatus.ACCEPTED,
      bookingEndTimeBefore: now,
    });

    const ownEmail = userEmail.toLowerCase();
    const peopleByEmail = new Map<string, BookingPersonDto>();

    // Rows arrive newest first, so the first row seen for an email is their most recent meeting
    for (const attendee of attendees) {
      if (!attendee.booking) continue;

      // Emails are case-insensitive, and the same person is often typed differently across bookings
      const emailKey = attendee.email.toLowerCase();
      if (emailKey === ownEmail) continue;

      const existing = peopleByEmail.get(emailKey);
      if (existing) {
        existing.meetingCount += 1;
        continue;
      }

      const eventType = attendee.booking.eventType;
      peopleByEmail.set(emailKey, {
        name: attendee.name,
        email: attendee.email,
        meetingCount: 1,
        lastMeetingAt: attendee.booking.endTime,
        lastEventType: eventType ? { slug: eventType.slug, teamSlug: eventType.team?.slug ?? null } : null,
      });
    }

    return Array.from(peopleByEmail.values());
  }
}
