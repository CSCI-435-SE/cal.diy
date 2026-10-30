import { RescheduleReasonRequirement } from "@calcom/prisma/enums";

export function isRescheduleReasonRequired(
  setting: RescheduleReasonRequirement | null | undefined,
  isHost: boolean
): boolean {
  // Event types created before this setting existed (or that haven't opted in) must not
  // suddenly require a reschedule reason, so an unset value defaults to no requirement.
  const requirement = setting ?? RescheduleReasonRequirement.OPTIONAL_BOTH;

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
