import path from "node:path";
import baseConfig from "./vitest.config.mts";

// Mutation testing for issue #162 (see stryker.162.config.mjs). The tests that exercise this issue's code are
// listed explicitly, because Stryker's `related` mode would also run every suite that imports EventAdvancedTab
// or the Prisma zod utils.
const baseAliases = Array.isArray(baseConfig.resolve?.alias) ? baseConfig.resolve.alias : [];

export default {
  ...baseConfig,
  resolve: {
    ...baseConfig.resolve,
    alias: [
      // The sandbox reuses the repo's node_modules, where @calcom/features links back to the original, unmutated
      // packages/features. Without this, code imported as @calcom/features/... is never mutated (false "no coverage").
      { find: /^@calcom\/features(?=\/|$)/, replacement: path.resolve(__dirname, "packages/features") },
      ...baseAliases,
    ],
  },
  test: {
    ...baseConfig.test,
    include: [
      "packages/features/waitlist/services/WaitlistService.test.ts",
      "packages/features/waitlist/repositories/WaitlistRepository.test.ts",
      "apps/web/modules/event-types/components/tabs/advanced/EventAdvancedTab.test.tsx",
      // Added after the before run. zod-utils.ts:160 yields no mutants, but this is the test that fails if the
      // schema stops keeping disableWaitlist (checked by deleting the line by hand).
      "packages/prisma/zod-utils.test.ts",
    ],
  },
};
