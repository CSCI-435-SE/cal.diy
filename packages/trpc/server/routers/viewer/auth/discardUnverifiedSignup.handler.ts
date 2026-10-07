import { getUserRepository } from "@calcom/features/di/containers/UserRepository";
import type { TrpcSessionUser } from "../../../types";

// Only accounts that were just created and never verified may be discarded, so an older
// account that merely lacks verification can't be wiped through the "use different email" flow.
const MAX_ACCOUNT_AGE_MS = 5 * 60 * 1000;

export const discardUnverifiedSignupHandler = async ({
  ctx,
}: {
  ctx: { user: NonNullable<TrpcSessionUser> };
}) => {
  const { id, emailVerified, createdDate } = ctx.user;
  // Returned rather than thrown: hitting the age limit is an expected outcome the UI explains,
  // and a thrown error would be logged as a console error by the client's tRPC logger.
  if (emailVerified || Date.now() - new Date(createdDate).getTime() > MAX_ACCOUNT_AGE_MS) {
    return { ok: false };
  }

  await getUserRepository().deleteMany({ userIds: [id] });
  return { ok: true };
};
