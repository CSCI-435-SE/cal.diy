import prismaMock from "@calcom/testing/lib/__mocks__/prisma";
import {
  BookingLocations,
  createBookingScenario,
  getBooker,
  getDate,
  getGoogleCalendarCredential,
  getOrganizer,
  getScenarioData,
  mockCalendar,
  mockCalendarToHaveNoBusySlots,
  mockSuccessfulVideoMeetingCreation,
  TestData,
} from "@calcom/testing/lib/bookingScenario/bookingScenario";
import {
  expectBookingCreatedWebhookToHaveBeenFired,
  expectBookingToBeInDatabase,
  expectSuccessfulBookingCreationEmails,
  expectSuccessfulCalendarEventCreationInCalendar,
} from "@calcom/testing/lib/bookingScenario/expects";
import { getMockRequestDataForBooking } from "@calcom/testing/lib/bookingScenario/getMockRequestDataForBooking";
import { setupAndTeardown } from "@calcom/testing/lib/bookingScenario/setupAndTeardown";

import { v4 as uuidv4 } from "uuid";
import { describe, expect } from "vitest";

import { getRecurringBookingService } from "@calcom/features/bookings/di/RecurringBookingService.container";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { ErrorCode } from "@calcom/lib/errorCodes";
import logger from "@calcom/lib/logger";
import { BookingStatus } from "@calcom/prisma/enums";
import { test } from "@calcom/testing/lib/fixtures/fixtures";

const DAY_IN_MS = 1000 * 60 * 60 * 24;

function getPlusDayDate(date: string, days: number) {
  return new Date(new Date(date).getTime() + days * DAY_IN_MS);
}

// Local test runs sometime gets too slow
const timeout = process.env.CI ? 5000 : 20000;
describe("handleNewRecurringBooking", () => {
  setupAndTeardown();

  describe("Recurring EventType:", () => {
    describe("User event type:", () => {
      test(
        `should create successful bookings for the number of slots requested
          1. Should create the same number of bookings as requested slots in the database
          2. Should send emails for the first booking only to the booker as well as organizer
          3. Should create a calendar event for every booking in the destination calendar
          3. Should trigger BOOKING_CREATED webhook for every booking
      `,
        async ({ emails }) => {
          const booker = getBooker({
            email: "booker@example.com",
            name: "Booker",
          });

          const organizer = getOrganizer({
            name: "Organizer",
            email: "organizer@example.com",
            id: 101,
            schedules: [TestData.schedules.IstWorkHours],
            credentials: [getGoogleCalendarCredential()],
            selectedCalendars: [TestData.selectedCalendars.google],
            destinationCalendar: {
              integration: "google_calendar",
              externalId: "organizer@google-calendar.com",
            },
          });

          const recurrence = getRecurrence({
            type: "weekly",
            numberOfOccurrences: 3,
          });
          const plus1DateString = getDate({ dateIncrement: 1 }).dateString;
          await createBookingScenario(
            getScenarioData({
              webhooks: [
                {
                  userId: organizer.id,
                  eventTriggers: ["BOOKING_CREATED"],
                  subscriberUrl: "http://my-webhook.example.com",
                  active: true,
                  eventTypeId: 1,
                  appId: null,
                },
              ],
              eventTypes: [
                {
                  id: 1,
                  slotInterval: 30,
                  length: 30,
                  recurringEvent: recurrence,
                  users: [
                    {
                      id: 101,
                    },
                  ],
                  destinationCalendar: {
                    integration: "google_calendar",
                    externalId: "event-type-1@google-calendar.com",
                  },
                },
              ],

              organizer,
              apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"]],
            })
          );

          mockSuccessfulVideoMeetingCreation({
            metadataLookupKey: "dailyvideo",
            videoMeetingData: {
              id: "MOCK_ID",
              password: "MOCK_PASS",
              url: `http://mock-dailyvideo.example.com/meeting-1`,
            },
          });

          const calendarMock = await mockCalendarToHaveNoBusySlots("googlecalendar", {
            create: {
              id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
              iCalUID: "MOCKED_GOOGLE_CALENDAR_ICS_ID",
            },
          });

          const recurringCountInRequest = 2;
          const mockBookingData = getMockRequestDataForBooking({
            data: {
              eventTypeId: 1,
              start: `${plus1DateString}T04:00:00.000Z`,
              end: `${plus1DateString}T04:30:00.000Z`,
              recurringEventId: uuidv4(),
              recurringCount: recurringCountInRequest,
              responses: {
                email: booker.email,
                name: booker.name,
                location: { optionValue: "", value: "integrations:daily" },
              },
            },
          });

          const numOfSlotsToBeBooked = 4;

          // Create an array of booking data for multiple slots
          const bookingDataArray = Array(numOfSlotsToBeBooked)
            .fill(mockBookingData)
            .map((mockBookingData, index) => {
              return {
                ...mockBookingData,
                start: getPlusDayDate(mockBookingData.start, index).toISOString(),
                end: getPlusDayDate(mockBookingData.end, index).toISOString(),
              };
            });

          const recurringBookingService = getRecurringBookingService();
          // Call handleNewRecurringBooking directly instead of through API
          const createdBookings = await recurringBookingService.createBooking({
            bookingData: bookingDataArray,
            bookingMeta: {
              userId: -1, // Simulating anonymous user like in the API test
            },
            creationSource: "WEBAPP",
          });

          expect(createdBookings.length).toBe(numOfSlotsToBeBooked);
          for (const [index, createdBooking] of Object.entries(createdBookings)) {
            logger.debug("Assertion for Booking with index:", index, { createdBooking });
            expect(createdBooking.responses).toEqual(
              expect.objectContaining({
                email: booker.email,
                name: booker.name,
              })
            );

            expect(createdBooking).toEqual(
              expect.objectContaining({
                location: "integrations:daily",
              })
            );

            await expectBookingToBeInDatabase({
              description: "",

              uid: createdBooking.uid!,
              eventTypeId: mockBookingData.eventTypeId,
              status: BookingStatus.ACCEPTED,
              recurringEventId: mockBookingData.recurringEventId,
              references: [
                {
                  type: "daily_video",
                  uid: "MOCK_ID",
                  meetingId: "MOCK_ID",
                  meetingPassword: "MOCK_PASS",
                  meetingUrl: "http://mock-dailyvideo.example.com/meeting-1",
                },
                {
                  type: "google_calendar",
                  uid: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
                  meetingId: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
                  meetingPassword: "MOCK_PASSWORD",
                },
              ],
            });

            expectBookingCreatedWebhookToHaveBeenFired({
              booker,
              organizer,
              location: "integrations:daily",
              subscriberUrl: "http://my-webhook.example.com",
              videoCallUrl: `${WEBAPP_URL}/video/${createdBookings[0].uid}`,
            });
          }

          expectSuccessfulBookingCreationEmails({
            booker,
            booking: {
              uid: createdBookings[0].uid!,
              urlOrigin: WEBAPP_URL,
            },
            organizer,
            emails,
            bookingTimeRange: {
              start: createdBookings[0].startTime!,

              end: createdBookings[0].endTime!,
            },
            iCalUID: "MOCKED_GOOGLE_CALENDAR_ICS_ID",
            recurrence: {
              ...recurrence,
              count: recurringCountInRequest,
            },
          });

          expect(emails.get().length).toBe(2);

          expectSuccessfulCalendarEventCreationInCalendar(calendarMock, [
            {
              calendarId: "event-type-1@google-calendar.com",
              videoCallUrl: "http://mock-dailyvideo.example.com/meeting-1",
            },
            {
              calendarId: "event-type-1@google-calendar.com",
              videoCallUrl: "http://mock-dailyvideo.example.com/meeting-1",
            },
            {
              calendarId: "event-type-1@google-calendar.com",
              videoCallUrl: "http://mock-dailyvideo.example.com/meeting-1",
            },
            {
              calendarId: "event-type-1@google-calendar.com",
              videoCallUrl: "http://mock-dailyvideo.example.com/meeting-1",
            },
          ]);
        },
        timeout
      );
    });
  });

  describe("Series reschedule:", () => {
    const seriesId = "series-reschedule-recurring-event-id";
    const seriesDays = [1, 8, 15].map((dateIncrement) => getDate({ dateIncrement }).dateString);
    const seriesUids = ["series-occurrence-1", "series-occurrence-2", "series-occurrence-3"];
    const booker = getBooker({ email: "booker@example.com", name: "Booker" });
    const organizerEmail = "organizer@example.com";

    const otherSeriesBookingUid = "other-series-occurrence";
    const otherSeriesDay = getDate({ dateIncrement: 22 }).dateString;

    async function setupSeries({
      busySlots = [],
      eventTypeOverrides = {},
      withOtherSeriesBooking = false,
    }: {
      busySlots?: { start: `${string}Z`; end: `${string}Z` }[];
      eventTypeOverrides?: { periodType?: "ROLLING"; periodDays?: number; periodCountCalendarDays?: boolean };
      withOtherSeriesBooking?: boolean;
    } = {}) {
      const otherSeriesBookings = withOtherSeriesBooking
        ? [
            {
              uid: otherSeriesBookingUid,
              eventTypeId: 1,
              userId: 101,
              status: BookingStatus.ACCEPTED,
              recurringEventId: "another-series-recurring-event-id",
              startTime: `${otherSeriesDay}T04:00:00.000Z`,
              endTime: `${otherSeriesDay}T04:30:00.000Z`,
            },
          ]
        : [];
      const organizer = getOrganizer({
        name: "Organizer",
        email: organizerEmail,
        id: 101,
        schedules: [TestData.schedules.IstWorkHours],
        credentials: [getGoogleCalendarCredential()],
        selectedCalendars: [TestData.selectedCalendars.google],
      });

      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            {
              id: 1,
              slotInterval: 30,
              length: 30,
              recurringEvent: { freq: 2, count: 3, interval: 1 },
              users: [{ id: 101 }],
              ...eventTypeOverrides,
            },
          ],
          bookings: [
            ...otherSeriesBookings,
            ...seriesDays.map((day, index) => ({
              uid: seriesUids[index],
              eventTypeId: 1,
              userId: 101,
              status: BookingStatus.ACCEPTED,
              recurringEventId: seriesId,
              startTime: `${day}T04:00:00.000Z`,
              endTime: `${day}T04:30:00.000Z`,
              references: [
                {
                  type: "google_calendar",
                  uid: `MOCK_EVENT_${index}`,
                  meetingId: `MOCK_EVENT_${index}`,
                  meetingPassword: "MOCK_PASSWORD",
                  meetingUrl: "https://UNUSED_URL",
                  externalCalendarId: "MOCK_EXTERNAL_CALENDAR_ID",
                  credentialId: undefined,
                },
              ],
            })),
          ],
          organizer,
          apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"]],
        })
      );

      mockSuccessfulVideoMeetingCreation({ metadataLookupKey: "dailyvideo" });
      await mockCalendar("googlecalendar", {
        create: { uid: "MOCK_ID" },
        update: { uid: "UPDATED_MOCK_ID" },
        busySlots,
      });
    }

    // Moves every occurrence from 04:00 to 04:15 UTC, which overlaps each occurrence's own old slot.
    function getSeriesRescheduleRequest(rescheduleUids = seriesUids) {
      const baseRequest = getMockRequestDataForBooking({
        data: {
          eventTypeId: 1,
          start: `${seriesDays[0]}T04:15:00.000Z`,
          end: `${seriesDays[0]}T04:45:00.000Z`,
          recurringEventId: seriesId,
          recurringCount: seriesDays.length,
          rescheduledBy: booker.email,
          responses: {
            email: booker.email,
            name: booker.name,
            location: { optionValue: "", value: BookingLocations.CalVideo },
          },
        },
      });

      return seriesDays.map((day, index) => ({
        ...baseRequest,
        start: `${day}T04:15:00.000Z`,
        end: `${day}T04:45:00.000Z`,
        rescheduleUid: rescheduleUids[index],
      }));
    }

    async function expectSeriesUnchanged() {
      const bookings = await prismaMock.booking.findMany({ where: { recurringEventId: seriesId } });
      expect(bookings).toHaveLength(seriesUids.length);
      expect(bookings.every((booking) => booking.status === BookingStatus.ACCEPTED)).toBe(true);
    }

    test(
      "moves every remaining occurrence, keeps the series and sends one set of emails",
      async ({ emails }) => {
        await setupSeries();

        const createdBookings = await getRecurringBookingService().createBooking({
          bookingData: getSeriesRescheduleRequest(),
          bookingMeta: { userId: -1 },
          creationSource: "WEBAPP",
        });

        expect(createdBookings).toHaveLength(seriesUids.length);
        for (const [index, oldUid] of seriesUids.entries()) {
          const oldBooking = await prismaMock.booking.findUnique({ where: { uid: oldUid } });
          expect(oldBooking).toEqual(
            expect.objectContaining({ status: BookingStatus.CANCELLED, rescheduled: true })
          );

          const newBooking = await prismaMock.booking.findUnique({
            where: { uid: createdBookings[index].uid },
          });
          expect(newBooking).toEqual(
            expect.objectContaining({
              status: BookingStatus.ACCEPTED,
              recurringEventId: seriesId,
              fromReschedule: oldUid,
              startTime: new Date(`${seriesDays[index]}T04:15:00.000Z`),
            })
          );
        }

        // Only the first slot sends: one rescheduled email to the organizer and one to the booker.
        expect(emails.get()).toHaveLength(2);
        const rescheduledTitle = "event_type_has_been_rescheduled_on_time_date";
        expect(emails).toHaveEmail({ titleTag: rescheduledTitle, to: organizerEmail }, organizerEmail);
        const bookerAddress = `${booker.name} <${booker.email}>`;
        expect(emails).toHaveEmail({ titleTag: rescheduledTitle, to: bookerAddress }, bookerAddress);
      },
      timeout
    );

    test(
      "reports the busy date and changes nothing when one date conflicts",
      async () => {
        await setupSeries({
          busySlots: [{ start: `${seriesDays[1]}T04:30:00.000Z`, end: `${seriesDays[1]}T05:00:00.000Z` }],
        });

        await expect(
          getRecurringBookingService().createBooking({
            bookingData: getSeriesRescheduleRequest(),
            bookingMeta: { userId: -1 },
            creationSource: "WEBAPP",
          })
        ).rejects.toMatchObject({
          code: ErrorCode.SeriesRescheduleConflict,
          data: { conflictingDates: [`${seriesDays[1]}T04:15:00.000Z`] },
        });

        await expectSeriesUnchanged();
      },
      timeout
    );

    test(
      "reports dates outside the booking window and changes nothing",
      async () => {
        await setupSeries({
          eventTypeOverrides: { periodType: "ROLLING", periodDays: 10, periodCountCalendarDays: true },
        });

        await expect(
          getRecurringBookingService().createBooking({
            bookingData: getSeriesRescheduleRequest(),
            bookingMeta: { userId: -1 },
            creationSource: "WEBAPP",
          })
        ).rejects.toMatchObject({
          code: ErrorCode.SeriesRescheduleConflict,
          data: { conflictingDates: [`${seriesDays[2]}T04:15:00.000Z`] },
        });

        await expectSeriesUnchanged();
      },
      timeout
    );

    test(
      "rejects a request that reuses an occurrence and changes nothing",
      async () => {
        await setupSeries();

        await expect(
          getRecurringBookingService().createBooking({
            bookingData: getSeriesRescheduleRequest([seriesUids[0], seriesUids[0], seriesUids[2]]),
            bookingMeta: { userId: -1 },
            creationSource: "WEBAPP",
          })
        ).rejects.toMatchObject({ code: ErrorCode.BadRequest });

        await expectSeriesUnchanged();
      },
      timeout
    );

    test(
      "rejects a request that includes an occurrence from another series and changes nothing",
      async () => {
        await setupSeries({ withOtherSeriesBooking: true });

        await expect(
          getRecurringBookingService().createBooking({
            bookingData: getSeriesRescheduleRequest([seriesUids[0], otherSeriesBookingUid, seriesUids[2]]),
            bookingMeta: { userId: -1 },
            creationSource: "WEBAPP",
          })
        ).rejects.toMatchObject({ code: ErrorCode.BadRequest });

        await expectSeriesUnchanged();
        const otherSeriesBooking = await prismaMock.booking.findUnique({
          where: { uid: otherSeriesBookingUid },
        });
        expect(otherSeriesBooking).toEqual(
          expect.objectContaining({
            status: BookingStatus.ACCEPTED,
            startTime: new Date(`${otherSeriesDay}T04:00:00.000Z`),
          })
        );
      },
      timeout
    );
  });

  function getRecurrence({
    type,
    numberOfOccurrences,
  }: {
    type: "weekly" | "monthly" | "yearly";
    numberOfOccurrences: number;
  }) {
    const freq = type === "yearly" ? 0 : type === "monthly" ? 1 : 2;
    return { freq, count: numberOfOccurrences, interval: 1 };
  }
});
