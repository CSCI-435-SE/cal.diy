-- CreateEnum
CREATE TYPE "public"."RescheduleReasonRequirement" AS ENUM ('MANDATORY_BOTH', 'MANDATORY_HOST_ONLY', 'MANDATORY_ATTENDEE_ONLY', 'OPTIONAL_BOTH');

-- AlterTable
ALTER TABLE "public"."EventType" ADD COLUMN     "requiresRescheduleReason" "public"."RescheduleReasonRequirement" DEFAULT 'MANDATORY_HOST_ONLY';
