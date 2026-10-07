import { getUserRepository } from "@calcom/features/di/containers/UserRepository";
import { TRPCError } from "@trpc/server";
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
  if (emailVerified || Date.now() - new Date(createdDate).getTime() > MAX_ACCOUNT_AGE_MS) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only a new, unverified account can be discarded" });
  }

  await getUserRepository().deleteMany({ userIds: [id] });
  return { ok: true };
};
