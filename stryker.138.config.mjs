// Mutation testing for issue #138 (Sprint 3, D6). Builds on the shared stryker.config.mjs by zach-short.
// Stryker 10 needs Node >= 22, so run it through nvm if the default Node is older:
//   Before: STRYKER_JSON=docs/sprint3/mutation/reports/138-zachbowden-before.json TZ=UTC nvm exec 22 node_modules/.bin/stryker run stryker.138.config.mjs
//   After:  STRYKER_JSON=docs/sprint3/mutation/reports/138-zachbowden-after.json TZ=UTC nvm exec 22 node_modules/.bin/stryker run stryker.138.config.mjs
import baseConfig from "./stryker.config.mjs";

/** @type {import("@stryker-mutator/api/core").PartialStrykerOptions} */
export default {
  ...baseConfig,
  // Only the lines this issue added or changed; the rest of these files is pre-existing code.
  mutate: [
    "packages/trpc/server/routers/viewer/bookings/confirm.handler.ts:185-201",
    "packages/trpc/server/routers/viewer/bookings/getRecurringOccurrences.handler.ts",
    "packages/trpc/server/routers/viewer/bookings/getRecurringOccurrences.schema.ts",
    "packages/features/bookings/repositories/BookingRepository.ts:685-692",
    "apps/web/components/dialog/ManageOccurrencesDialog.tsx",
    "apps/web/components/booking/BookingListItem.tsx:171-172",
    "apps/web/components/booking/BookingListItem.tsx:473-484",
  ],
  vitest: {
    configFile: "vitest.stryker-138.config.mts",
    related: false,
  },
  jsonReporter: { fileName: process.env.STRYKER_JSON ?? "reports/mutation/138.json" },
  htmlReporter: { fileName: "reports/mutation/138.html" },
};
