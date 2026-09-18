import { RescheduleReasonRequirement } from "@calcom/prisma/enums";

export function isRescheduleReasonRequired(
  setting: RescheduleReasonRequirement | null | undefined,
  isHost: boolean
): boolean {
  const requirement = setting ?? RescheduleReasonRequirement.MANDATORY_HOST_ONLY;

  switch (requirement) {
    case RescheduleReasonRequirement.OPTIONAL_BOTH:
      return false;
    case RescheduleReasonRequirement.MANDATORY_BOTH:
      return true;
    case RescheduleReasonRequirement.MANDATORY_HOST_ONLY:
      return isHost;
    case RescheduleReasonRequirement.MANDATORY_ATTENDEE_ONLY:
      return !isHost;
    default:
      return false;
  }
}
