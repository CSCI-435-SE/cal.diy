# Explain PR 79

**Created:** 10/8/2026 10:17:08  
**Updated:** 10/8/2026 12:27:55  
**Exported:** 10/8/2026 23:12:35  
**Link:** [https://claude.ai/chat/f88b651a-c01b-4eb1-842c-fc63cf765c7f](https://claude.ai/chat/f88b651a-c01b-4eb1-842c-fc63cf765c7f)  

## User:

> 10/8/2026 10:17:09

> File: 

Hey Claude, I am working on a coding project and I am doing a code review. I asked Claude Code to look into the files related to a change (Cal.diy fork) involving sending an email reminder 24 hours in advance. Can you put it in more intuitive terms for me? Thank you!

## Assistant:

> 10/8/2026 10:17:22

Sure! Here's a plain-English breakdown of what this change does and how it hangs together.

---

**What it does**

When someone books a meeting, they (and the host) now get a reminder email 24 hours before it starts.

---

**How it works, step by step**

1. **Booking confirmed → reminder scheduled.** The moment a booking is confirmed — either instantly or after a host approves it — the code drops a "send this email later" job into a task queue stored in the database, set to fire 24 hours before the meeting.

2. **Booking cancelled or rescheduled → reminder deleted.** The task is tagged with the booking's ID. The codebase already had cleanup logic that wipes all tasks for a booking when it's cancelled or rescheduled, so the reminder just piggybacks on that — no new cleanup code needed.

3. **Rescheduling is really a delete + recreate.** A rescheduled meeting gets a brand new booking ID, so the old reminder is deleted and the new booking schedules its own fresh reminder.

4. **A background job actually sends it.** A cron job periodically scans the task queue, finds jobs whose scheduled time has passed, and runs them. The reminder handler double-checks the booking is still active before sending, just in case the cleanup somehow missed it.

5. **The emails reuse existing templates.** Rather than building new emails from scratch, the reminder emails extend the existing "booking confirmed" email design — same layout, location, links — just with a different subject line ("Reminder: [title] at [date]") and heading ("Your event starts in 24 hours"), and without re-attaching the calendar invite (which would confuse calendar apps into thinking it's a new event).

---

**Edge cases handled**

- If the meeting is booked *less than* 24 hours before it starts, no reminder is scheduled at all (there's no time for one).
- Both the host and attendees get the email by default.
- If the booking is already gone when the job runs, the handler quietly skips sending.

---

**Things the reviewer flagged as worth watching**

- The reminder cleanup relies on a function originally written for a different purpose (no-show handling). If someone ever tightens that function, reminders could stop being cleaned up silently.
- For rescheduled bookings that *need host approval*, the original reminder might not get deleted until later — the timing is a bit unclear.
- For team events, **only the organizer gets the host-side reminder**, not other team members, due to how the booking data is fetched.
- "24 hours before" really means "the next time the cron job runs after the 24-hour mark," so it's approximate.

## User:

> 10/8/2026 10:20:52

Now that I have a broad understanding, could you please go a little further into the technical details of how the change is implemented? Can you also please go file by file (as the original analysis did) and explain what changed? Thank you!

## Assistant:

> 10/8/2026 10:21:16

Sure! Here's a file-by-file walkthrough of the technical implementation.

---

## New Files

### `handleNewBooking/scheduleBookingReminderEmail.ts`
This is the core scheduling function. It exports a constant `BOOKING_REMINDER_LEAD_TIME_MS` (24 hours in milliseconds — exported so tests can reference the same value rather than hardcoding `86400000`). The main function takes a booking's `id`, `uid`, and `startTime`, then:
- Computes `scheduledAt = startTime - 24h`
- **Returns early** if `scheduledAt` is already in the past — this is the sole mechanism enforcing the "only schedule if the meeting is >24h away" rule
- Otherwise calls `tasker.create("sendBookingReminderEmail", { bookingId, startTime }, { scheduledAt, referenceUid: uid })`

The `referenceUid: uid` part is the key design choice — it's what allows the existing no-show cleanup to delete reminders with zero new code, because that cleanup deletes *all* tasks matching a given `referenceUid`.

---

### `tasker/tasks/sendBookingReminderEmail.ts`
This is the handler that actually runs when the cron job fires. It:
1. **Validates the payload** using a Zod schema (`{ bookingId: number, startTime: string }`). If the payload is malformed, it throws, causing the task processor to retry it.
2. **Rebuilds the full calendar event** by calling the existing `getBooking(bookingId)` helper (borrowed from the payments flow), which reconstructs the attendee list, organizer details, translations, and event type metadata.
3. **Guards before sending** — skips the email if the booking's status is no longer `ACCEPTED` or if the `startTime` in the payload doesn't match the current booking's start time. This is a safety net in case the cleanup didn't fire.
4. Calls `sendBookingReminderEmails(evt, metadata)`.

---

### `templates/attendee-booking-reminder-email.ts` and `templates/organizer-booking-reminder-email.ts`
Both extend their respective existing "booking scheduled" email classes, inheriting all the layout, timezone handling, location/video link, and reschedule/cancel links. They override just three things in `getNodeMailerPayload()`:
- `icalEvent: undefined` — strips the calendar attachment so it doesn't trigger a calendar update notification
- The **subject line**, using the new `booking_reminder_subject` i18n key
- The **plain-text body heading**, using `booking_reminder_title`

`getHtml()` is also overridden to pass the reminder heading into the existing React email template. The organizer version additionally passes `teamMember` context.

---

## Modified Files

### `RegularBookingService.ts`
This handles bookings that are **confirmed immediately** (no host approval needed). A new `try/catch` block is added around line 2553 that calls `scheduleBookingReminderEmail(booking)` when `isConfirmedByDefault && !isDryRun`. Errors are caught and logged rather than thrown, so a scheduling failure never causes the booking itself to fail — this deliberately mirrors the pattern used by the existing `scheduleNoShowTriggers` block just above it.

There's also a minor cleanup: the `isRescheduleReasonRequired` import was moved, and one long line was re-wrapped — both are just formatter noise.

---

### `handleConfirmation.ts`
This handles bookings that **required host approval** and have just been approved. After confirmation it loops over `updatedBookings` and calls `scheduleBookingReminderEmail` for each one. For a recurring series, this means each occurrence gets its own reminder task. It uses `Promise.allSettled` (rather than `Promise.all`) so that one failure doesn't block the rest — each failure is logged individually.

---

### `tasker/tasker.ts`
Adds `sendBookingReminderEmail` to the `TaskPayloads` type map, keyed to the Zod schema defined in the handler file. This gives `tasker.create(...)` a fully typed payload — TypeScript will complain if you pass the wrong shape.

---

### `tasker/tasks/index.ts`
Registers the new handler as a **lazy import**. The task processor looks up handlers by `task.type` at runtime — without this entry, the cron job would throw "Task handler not found" when it tried to process a reminder task.

---

### `email-manager.ts`
Adds `sendBookingReminderEmails(calEvent, metadata)`, following the exact same pattern as the other send functions in this file:
- Normalizes the event with `formatCalEvent`
- Sends host emails (one to the organizer + one per team member) unless `eventTypeDisableHostEmail` is set
- Sends attendee emails unless `shouldSkipAttendeeEmailWithSettings` says to skip, stripping calendar notes if `hideCalendarNotes` is set
- Fires everything with `Promise.all`

The lodash/zod import reordering elsewhere in this file is just formatter noise.

---

### `i18n/locales/en/common.json`
Two new i18n strings:
- `booking_reminder_subject`: `"Reminder: {{title}} at {{date}}"`
- `booking_reminder_title`: `"Your event starts in 24 hours"`

These are the only two visible user-facing strings added by the entire PR.

Powered by Claude Exporter (https://www.ai-chat-exporter.net)
