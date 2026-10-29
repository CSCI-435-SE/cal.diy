-- AlterTable
ALTER TABLE "public"."EventType" ALTER COLUMN "requiresRescheduleReason" SET DEFAULT 'OPTIONAL_BOTH';

-- No UI or API could set this column before this change, so every MANDATORY_HOST_ONLY value came
-- from the old default, not a host's choice. Resetting them keeps existing event types from
-- suddenly requiring a reschedule reason.
UPDATE "public"."EventType"
SET "requiresRescheduleReason" = 'OPTIONAL_BOTH'
WHERE "requiresRescheduleReason" = 'MANDATORY_HOST_ONLY';
