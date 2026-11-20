// Mutation testing for issue #130 (Sprint 3, D6). Builds on the shared stryker.config.mjs by Zach Bowden (PR #140).
//   Before: STRYKER_JSON=docs/sprint3/mutation/reports/130-zach-short-before.json TZ=UTC node_modules/.bin/stryker run stryker.130.config.mjs
//   After:  STRYKER_JSON=docs/sprint3/mutation/reports/130-zach-short-after.json TZ=UTC node_modules/.bin/stryker run stryker.130.config.mjs

import process from "node:process";
import baseConfig from "./stryker.config.mjs";

/** @type {import("@stryker-mutator/api/core").PartialStrykerOptions} */
export default {
  ...baseConfig,
  // Only the lines PR #153 added or changed; the rest of these files is pre-existing code.
  mutate: [
    "apps/web/modules/bookings/lib/formatAwayWindow.ts",
    "apps/web/modules/bookings/components/AvailableTimes.tsx:275-283",
    "apps/web/modules/bookings/components/AvailableTimes.tsx:309-309",
    "apps/web/modules/bookings/components/AvailableTimes.tsx:311-311",
    "apps/web/modules/bookings/components/AvailableTimes.tsx:369-372",
    "apps/web/modules/bookings/components/AvailableTimes.tsx:382-382",
    "apps/web/modules/bookings/components/AvailableTimeSlots.tsx:206-208",
    "apps/web/modules/bookings/components/AvailableTimeSlots.tsx:218-218",
    "apps/web/modules/bookings/components/OutOfOfficeInSlots.tsx:36-36",
    "apps/web/modules/bookings/components/OutOfOfficeInSlots.tsx:70-73",
    "packages/features/schedules/lib/slots.ts:260-264",
  ],
  vitest: {
    configFile: "vitest.stryker-130.config.mts",
    related: false,
  },
  jsonReporter: { fileName: process.env.STRYKER_JSON ?? "reports/mutation/130.json" },
  htmlReporter: { fileName: "reports/mutation/130.html" },
};
