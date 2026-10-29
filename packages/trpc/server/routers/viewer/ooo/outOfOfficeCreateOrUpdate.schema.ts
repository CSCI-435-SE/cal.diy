import { z } from "zod";

const ZTimeOfDay = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const ZOutOfOfficeInputSchema = z.object({
  uuid: z.string().nullish(),
  forUserId: z.number().nullish(),
  dateRange: z.object({
    startDate: z.date(),
    endDate: z.date(),
  }),
  startDateOffset: z.number(),
  endDateOffset: z.number(),
  // "HH:mm" on the start and end dates. Absent means the whole day, which is what every client sent before.
  startTime: ZTimeOfDay.optional(),
  endTime: ZTimeOfDay.optional(),
  toTeamUserId: z.number().nullable(),
  reasonId: z.number(),
  notes: z.string().nullable().optional(),
  showNotePublicly: z.boolean().optional(),
});

export type TOutOfOfficeInputSchema = z.infer<typeof ZOutOfOfficeInputSchema>;
