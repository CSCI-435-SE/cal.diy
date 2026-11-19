import AttendeeRunningLateEmail from "@calcom/emails/templates/attendee-running-late-email";
import { getTranslation } from "@calcom/i18n/server";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import logger from "@calcom/lib/logger";
import { BookingStatus } from "@calcom/prisma/enums";
import { isWithinRunningLateWindow, type RunningLateDelayMinutes } from "../lib/runningLate";
import type { BookingRepository } from "../repositories/BookingRepository";

const log = logger.getSubLogger({ prefix: ["RunningLateService"] });

export interface IRunningLateServiceDeps {
  bookingRepository: BookingRepository;
}

export type SendRunningLateNoticeInput = {
  bookingId: number;
  userId: number;
  delayMinutes: RunningLateDelayMinutes;
  message?: string;
  now?: Date;
};

export class RunningLateService {
  constructor(private readonly deps: IRunningLateServiceDeps) {}

  async sendNotice({
    bookingId,
    userId,
    delayMinutes,
    message,
    now = new Date(),
  }: SendRunningLateNoticeInput): Promise<{ recipientCount: number }> {
    const booking = await this.deps.bookingRepository.findByIdIncludeUserAndAttendeeTimeZones(bookingId);

    if (!booking) {
      throw new ErrorWithCode(ErrorCode.BookingNotFound, `Booking ${bookingId} not found`);
    }

    // Only the organizer may send: co-hosts and admins can see the booking but aren't the one running late
    if (booking.userId !== userId || !booking.user) {
      throw ErrorWithCode.Factory.Forbidden("Only the booking's host can send a running late notice");
    }

    if (booking.status !== BookingStatus.ACCEPTED) {
      throw ErrorWithCode.Factory.BadRequest("Running late notices can only be sent for accepted bookings");
    }

    if (!isWithinRunningLateWindow({ startTime: booking.startTime, endTime: booking.endTime, now })) {
      throw ErrorWithCode.Factory.BadRequest(
        "Running late notices can only be sent within 2 hours of the start time or while the booking is in progress"
      );
    }

    const host = booking.user;
    const seenEmails = new Set<string>([host.email.toLowerCase()]);
    const recipients = booking.attendees.filter((attendee) => {
      const email = attendee.email.toLowerCase();
      if (seenEmails.has(email)) return false;
      seenEmails.add(email);
      return true;
    });

    if (recipients.length === 0) return { recipientCount: 0 };

    const eventTitle = booking.title;
    const trimmedMessage = message?.trim() || undefined;

    const results = await Promise.allSettled(
      recipients.map(async (attendee) => {
        const locale = attendee.locale ?? "en";
        const t = await getTranslation(locale, "common");
        return new AttendeeRunningLateEmail({
          attendee: { name: attendee.name, email: attendee.email, timeZone: attendee.timeZone, locale },
          hostName: host.name ?? host.email,
          hostEmail: host.email,
          eventTitle,
          startTime: booking.startTime,
          delayMinutes,
          message: trimmedMessage,
          t,
        }).sendEmail();
      })
    );

    // BaseEmail.sendEmail logs and swallows transport (SMTP) errors and always resolves, so only
    // failures before the send (translation, building the email) reach this point. We therefore
    // can't know how many emails were delivered and only report how many attendees we tried.
    const failures = results.filter((result) => result.status === "rejected");
    if (failures.length > 0) {
      log.error(`Failed to send ${failures.length} running late email(s) for booking ${booking.uid}`, {
        reasons: failures.map((failure) => String(failure.reason)),
      });
    }

    return { recipientCount: recipients.length };
  }
}
