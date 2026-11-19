// Mutation testing for issue #137 (Sprint 3, D6). Builds on the shared stryker.config.mjs by zach-short and
// follows the per-issue layout of stryker.138.config.mjs by lexzach.
// Stryker 10 needs Node >= 22, so run it through nvm if the default Node is older:
//   Before: STRYKER_JSON=docs/sprint3/mutation/reports/137-kojoshuay-before.json TZ=UTC nvm exec 22 node_modules/.bin/stryker run stryker.137.config.mjs
//   After:  STRYKER_JSON=docs/sprint3/mutation/reports/137-kojoshuay-after.json TZ=UTC nvm exec 22 node_modules/.bin/stryker run stryker.137.config.mjs

import process from "node:process";
import baseConfig from "./stryker.config.mjs";

/** @type {import("@stryker-mutator/api/core").PartialStrykerOptions} */
export default {
  ...baseConfig,
  // Only code this issue added that unit tests exercise. The BookingRepository select, email template,
  // tRPC handler and React components have no unit tests, so their mutants would all be NoCoverage noise.
  mutate: [
    "packages/features/bookings/lib/runningLate.ts",
    "packages/features/bookings/services/RunningLateService.ts",
    "apps/web/components/booking/actions/bookingActions.ts:185-210",
  ],
  vitest: {
    configFile: "vitest.stryker-137.config.mts",
    related: false,
  },
  jsonReporter: { fileName: process.env.STRYKER_JSON ?? "reports/mutation/137.json" },
  htmlReporter: { fileName: "reports/mutation/137.html" },
};
