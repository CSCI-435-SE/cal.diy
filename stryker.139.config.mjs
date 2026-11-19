// Mutation testing for issue #139 (Sprint 3, D6). Builds on the shared stryker.config.mjs by Zachary Short
// (PR #135, carried in Zach Bowden's PR #140); the per-issue line ranges and explicit test list follow #140 and #153.
// Stryker 10 needs Node >= 22. On Windows (nvm has no `exec`), call Node 22 by its path from PowerShell:
//   $env:TZ="UTC"; & "$env:LOCALAPPDATA\Author Software\nvm\installs\v22.23.5\node.exe" node_modules/@stryker-mutator/core/bin/stryker.js run stryker.139.config.mjs
// Official runs also set $env:STRYKER_JSON="docs/sprint3/mutation/reports/139-julissaehp-<before|after>.json".

import process from "node:process";
import baseConfig from "./stryker.config.mjs";

/** @type {import("@stryker-mutator/api/core").PartialStrykerOptions} */
export default {
  ...baseConfig,
  // Only the executable lines issue #139 added or changed: PR #142 (settings UI) and PR 2 (persistence,
  // enforcement, booking page, bookings list). Imports, type-only lines, the `null` default in defaultEvents.ts
  // and the test builder produce no mutants and are left out. A single line must be written `file:N-N`.
  mutate: [
    // Settings UI and form persistence
    "apps/web/modules/event-types/components/tabs/advanced/MinimumCancellationNoticeController.tsx",
    "apps/web/modules/event-types/components/tabs/advanced/EventAdvancedTab.tsx:831-831",
    "apps/web/modules/event-types/components/tabs/advanced/EventAdvancedTab.tsx:844-844",
    "apps/web/modules/feature-flags/hooks/useFlags.ts:28-28",
    "packages/platform/atoms/event-types/hooks/useEventTypeForm.ts:96-96",
    "packages/trpc/server/routers/viewer/eventTypes/types.ts:162-162",
    "packages/prisma/zod-utils.ts:715-715",
    "packages/prisma/zod-utils.ts:798-798",
    "packages/features/eventtypes/repositories/eventTypeRepository.ts:621-621",
    "packages/features/eventtypes/repositories/eventTypeRepository.ts:903-903",
    // Enforcement rules and server check
    "packages/features/bookings/lib/minimumCancellationNotice.ts",
    "packages/features/bookings/repositories/BookingRepository.ts:693-728",
    "apps/web/app/api/cancel/route.ts:57-79",
    // Booking page
    "apps/web/lib/booking.ts:48-48",
    "apps/web/modules/bookings/views/bookings-single-view.getServerSideProps.tsx:140-143",
    "apps/web/modules/bookings/views/bookings-single-view.getServerSideProps.tsx:146-149",
    "apps/web/modules/bookings/views/bookings-single-view.tsx:417-428",
    "apps/web/modules/bookings/views/bookings-single-view.tsx:886-886",
    "apps/web/modules/bookings/views/bookings-single-view.tsx:916-916",
    "apps/web/modules/bookings/views/bookings-single-view.tsx:922-922",
    "apps/web/modules/bookings/views/bookings-single-view.tsx:933-939",
    "apps/web/components/booking/CancelBooking.tsx:361-363",
    // Bookings list
    "packages/trpc/server/routers/viewer/bookings/get.handler.ts:534-534",
    "apps/web/components/booking/actions/bookingActions.ts:12-32",
    "apps/web/components/booking/actions/bookingActions.ts:311-317",
    "apps/web/components/booking/BookingListItem.tsx:130-130",
    "apps/web/components/booking/BookingListItem.tsx:221-221",
    "apps/web/components/booking/actions/BookingActionsDropdown.tsx:72-72",
    "apps/web/components/booking/actions/BookingActionsDropdown.tsx:240-240",
  ],
  vitest: {
    configFile: "vitest.stryker-139.config.mts",
    related: false,
  },
  jsonReporter: { fileName: process.env.STRYKER_JSON ?? "reports/mutation/139.json" },
  htmlReporter: { fileName: "reports/mutation/139.html" },
};
