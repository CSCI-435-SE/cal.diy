/**
 * Builds a public booking page link for the same event type, prefilled with a previous attendee.
 * Shared by the "Book again" booking action and the People view.
 * @returns The relative booking link, or null when the event type can no longer be booked by link
 */
export function buildBookAgainUrl({
  eventType,
  username,
  attendee,
}: {
  eventType: { slug?: string | null; team?: { slug?: string | null } | null } | null | undefined;
  username?: string | null;
  attendee: { name: string; email: string };
}): string | null {
  const slug = eventType?.slug;
  if (!slug) return null;

  const teamSlug = eventType.team?.slug;
  let basePath: string;
  if (teamSlug) {
    basePath = `/team/${teamSlug}/${slug}`;
  } else if (username) {
    basePath = `/${username}/${slug}`;
  } else {
    return null;
  }

  const urlSearchParams = new URLSearchParams({ name: attendee.name, email: attendee.email });
  return `${basePath}?${urlSearchParams.toString()}`;
}
