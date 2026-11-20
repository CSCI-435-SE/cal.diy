// Mutation testing for issue #162 (Sprint 3, D6). Builds on the shared stryker.config.mjs by zach-short.
// Stryker 10 needs Node >= 22, so run it with Node 22 if the default Node is older:
//   Before: STRYKER_JSON=docs/sprint3/mutation/reports/162-julissaehp-before.json TZ=UTC <node22> node_modules/@stryker-mutator/core/bin/stryker.js run stryker.162.config.mjs
//   After:  STRYKER_JSON=docs/sprint3/mutation/reports/162-julissaehp-after.json TZ=UTC <node22> node_modules/@stryker-mutator/core/bin/stryker.js run stryker.162.config.mjs

import process from "node:process";
import baseConfig from "./stryker.config.mjs";

/** @type {import("@stryker-mutator/api/core").PartialStrykerOptions} */
export default {
  ...baseConfig,
  // Only the lines this issue added or changed. A single line must be written as a range (`:160-160`).
  mutate: [
    "packages/features/waitlist/services/WaitlistService.ts:58-60",
    "packages/features/waitlist/services/WaitlistService.ts:102-104",
    "packages/features/waitlist/services/WaitlistService.ts:144-146",
    "packages/features/waitlist/repositories/WaitlistRepository.ts:114-114",
    "packages/features/waitlist/repositories/WaitlistRepository.ts:122-122",
    "packages/features/waitlist/repositories/WaitlistRepository.ts:128-131",
    "apps/web/modules/event-types/components/tabs/advanced/EventAdvancedTab.tsx:1264-1280",
    "packages/prisma/zod-utils.ts:160-160",
  ],
  vitest: {
    configFile: "vitest.stryker-162.config.mts",
    related: false,
  },
  jsonReporter: { fileName: process.env.STRYKER_JSON ?? "reports/mutation/162.json" },
  htmlReporter: { fileName: "reports/mutation/162.html" },
};
