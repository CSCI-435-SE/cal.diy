import prismaMock from "@calcom/testing/lib/__mocks__/prisma";
import { cancelNoShowTasksForBooking } from "@calcom/features/webhooks/lib/scheduleTrigger";
import { describe, expect, it } from "vitest";
import { BOOKING_REMINDER_LEAD_TIME_MS, scheduleBookingReminderEmail } from "./scheduleBookingReminderEmail";

const HOUR_MS = 60 * 60 * 1000;

const findReminderTasks = (referenceUid: string) =>
  prismaMock.task.findMany({ where: { type: "sendBookingReminderEmail", referenceUid } });

describe("scheduleBookingReminderEmail", () => {
  it("schedules the reminder exactly 24 hours before the start time", async () => {
    const startTime = new Date(Date.now() + 72 * HOUR_MS);

    await scheduleBookingReminderEmail({ id: 1, uid: "booking-uid", startTime });

    const tasks = await findReminderTasks("booking-uid");
    expect(tasks).toHaveLength(1);
    expect(tasks[0].scheduledAt.getTime()).toBe(startTime.getTime() - BOOKING_REMINDER_LEAD_TIME_MS);
    expect(BOOKING_REMINDER_LEAD_TIME_MS).toBe(24 * HOUR_MS);
    expect(JSON.parse(tasks[0].payload)).toEqual({ bookingId: 1, startTime: startTime.toISOString() });
  });

  it("does not schedule a reminder when the booking starts less than 24 hours from now", async () => {
    await scheduleBookingReminderEmail({
      id: 2,
      uid: "soon-booking-uid",
      startTime: new Date(Date.now() + 23 * HOUR_MS),
    });

    expect(await findReminderTasks("soon-booking-uid")).toHaveLength(0);
  });

  it("is removed by the cleanup that runs when a booking is cancelled or rescheduled", async () => {
    await scheduleBookingReminderEmail({
      id: 3,
      uid: "cancelled-booking-uid",
      startTime: new Date(Date.now() + 48 * HOUR_MS),
    });
    expect(await findReminderTasks("cancelled-booking-uid")).toHaveLength(1);

    await cancelNoShowTasksForBooking({ bookingUid: "cancelled-booking-uid" });

    expect(await findReminderTasks("cancelled-booking-uid")).toHaveLength(0);
  });
});
