// Mutation testing for issue #154 (Sprint 3, D6). Builds on the shared stryker.config.mjs by zach-short.
// Stryker 10 needs Node >= 22, so run it through nvm if the default Node is older:
//   Before: STRYKER_JSON=docs/sprint3/mutation/reports/154-zachbowden-before.json TZ=UTC nvm exec 22 node_modules/.bin/stryker run stryker.154.config.mjs
//   After:  STRYKER_JSON=docs/sprint3/mutation/reports/154-zachbowden-after.json TZ=UTC nvm exec 22 node_modules/.bin/stryker run stryker.154.config.mjs

import process from "node:process";
import baseConfig from "./stryker.config.mjs";

/** @type {import("@stryker-mutator/api/core").PartialStrykerOptions} */
export default {
  ...baseConfig,
  // Only the lines this issue added or changed; the rest of these files is pre-existing code.
  mutate: [
    "packages/features/waitlist/services/WaitlistService.ts:58-66",
    "packages/features/waitlist/services/WaitlistService.ts:96-128",
    "packages/features/waitlist/services/WaitlistService.ts:130-187",
    "packages/features/waitlist/services/WaitlistService.ts:197-211",
    "packages/features/waitlist/services/WaitlistService.ts:219-229",
    "packages/features/waitlist/repositories/WaitlistRepository.ts:90-95",
    "packages/features/waitlist/repositories/WaitlistRepository.ts:120-120",
    "packages/features/waitlist/repositories/WaitlistRepository.ts:145-145",
    "packages/features/waitlist/repositories/WaitlistRepository.ts:168-179",
    "packages/features/bookings/lib/handleCancelBooking.ts:67-88",
    "packages/features/bookings/lib/handleCancelBooking.ts:340-341",
    "packages/features/bookings/lib/handleCancelBooking.ts:455-455",
    "apps/web/pages/api/book/event.ts:65-76",
    "apps/web/modules/bookings/components/AvailableTimes.tsx:281-283",
    "apps/web/modules/bookings/components/AvailableTimes.tsx:313-313",
    "apps/web/modules/bookings/components/AvailableTimes.tsx:332-353",
  ],
  vitest: {
    configFile: "vitest.stryker-154.config.mts",
    related: false,
  },
  jsonReporter: { fileName: process.env.STRYKER_JSON ?? "reports/mutation/154.json" },
  htmlReporter: { fileName: "reports/mutation/154.html" },
};
