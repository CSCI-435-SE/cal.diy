import type { IFromUser, IToUser } from "@calcom/features/availability/lib/getUserAvailability";

export type SlotInfo = {
  time: string;
  userIds?: number[];
  away?: boolean;
  fromUser?: IFromUser;
  toUser?: IToUser;
  reason?: string;
  emoji?: string;
  notes?: string | null;
  showNotePublicly?: boolean;
  /** ISO start of the partial-day out-of-office window that marks this slot. A whole-day entry has none. */
  outOfOfficeStart?: string;
  outOfOfficeEnd?: string;
};

export type Slots = Record<string, SlotInfo[]>;
