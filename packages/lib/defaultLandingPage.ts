import type { DefaultLandingPage } from "@calcom/prisma/zod-utils";
import { userMetadata } from "@calcom/prisma/zod-utils";

export const DEFAULT_LANDING_PAGE: DefaultLandingPage = "event-types";

export const defaultLandingPagePaths: Record<DefaultLandingPage, string> = {
  "event-types": "/event-types",
  // /bookings has no index route; "upcoming" is the tab the main nav links to
  bookings: "/bookings/upcoming",
  availability: "/availability",
};

export const getDefaultLandingPage = (metadata: unknown): DefaultLandingPage => {
  // safeParse so malformed metadata can never block a user from reaching the app after login
  const parsed = userMetadata.safeParse(metadata);
  if (!parsed.success) return DEFAULT_LANDING_PAGE;
  return parsed.data?.defaultLandingPage ?? DEFAULT_LANDING_PAGE;
};

export const getDefaultLandingPagePath = (metadata: unknown): string =>
  defaultLandingPagePaths[getDefaultLandingPage(metadata)];
