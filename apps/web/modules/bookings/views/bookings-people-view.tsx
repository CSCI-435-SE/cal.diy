"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import { Button } from "@calcom/ui/components/button";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { ToggleGroup } from "@calcom/ui/components/form";
import { SkeletonText } from "@calcom/ui/components/skeleton";
import { useRouter } from "next/navigation";
import { useBookingStatusTab } from "~/bookings/hooks/useBookingStatusTab";
import { buildBookAgainUrl } from "~/bookings/lib/buildBookAgainUrl";

export default function BookingsPeopleView() {
  const { t, i18n } = useLocale();
  const router = useRouter();
  const { currentTab, tabOptions } = useBookingStatusTab();
  const { data: me } = useMeQuery();
  const { data: people, isPending } = trpc.viewer.bookings.getPeople.useQuery();

  const dateFormatter = new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" });

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto md:overflow-visible">
        <ToggleGroup
          value={currentTab}
          onValueChange={(value) => {
            const selectedTab = tabOptions.find((tab) => tab.value === value);
            if (selectedTab?.href) router.push(selectedTab.href);
          }}
          options={tabOptions}
        />
      </div>

      {isPending ? (
        <div className="flex flex-col gap-2">
          <SkeletonText className="h-12 w-full" />
          <SkeletonText className="h-12 w-full" />
          <SkeletonText className="h-12 w-full" />
        </div>
      ) : !people?.length ? (
        <EmptyScreen
          Icon="users"
          headline={t("no_people_yet")}
          description={t("no_people_yet_description")}
        />
      ) : (
        <ul className="border-subtle divide-subtle divide-y rounded-md border" data-testid="people-list">
          {people.map((person) => {
            const bookAgainUrl = buildBookAgainUrl({
              eventType: person.lastEventType
                ? { slug: person.lastEventType.slug, team: { slug: person.lastEventType.teamSlug } }
                : null,
              username: me?.username,
              attendee: { name: person.name, email: person.email },
            });

            return (
              <li
                key={person.email.toLowerCase()}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                data-testid="people-list-item">
                <div className="min-w-0">
                  <p className="text-emphasis truncate text-sm font-semibold">
                    {person.name || person.email}
                  </p>
                  <p className="text-subtle truncate text-sm">{person.email}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-subtle text-right text-sm">
                    <p>{t("meeting_count", { count: person.meetingCount })}</p>
                    <p>{t("last_met_on", { date: dateFormatter.format(new Date(person.lastMeetingAt)) })}</p>
                  </div>
                  {bookAgainUrl ? (
                    <Button color="secondary" StartIcon="repeat" href={bookAgainUrl}>
                      {t("book_again")}
                    </Button>
                  ) : (
                    <Button color="secondary" StartIcon="repeat" disabled>
                      {t("book_again")}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
