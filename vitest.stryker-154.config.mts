import path from "node:path";
import baseConfig from "./vitest.config.mts";

// Mutation testing for issue #154 (see stryker.154.config.mjs). Stryker's `related` mode would also run every
// test that imports handleCancelBooking or AvailableTimes, including slow, unrelated booking suites, so the
// tests that exercise this issue's code are listed explicitly instead.
// handleSeats.test.ts's "Correct parameters being passed" tests spy on the handleSeats module's default export,
// which fails inside Stryker's instrumented sandbox (it passes under plain Vitest). They don't touch this issue's
// code, and a failing test stops Stryker before it mutates anything, so they are excluded by name.
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
      "apps/web/pages/api/book/event.test.ts",
      "packages/features/bookings/lib/handleSeats/test/handleSeats.test.ts",
      "apps/web/modules/bookings/components/AvailableTimes.test.tsx",
    ],
    testNamePattern: /^(?!handleSeats Correct parameters being passed)/,
  },
};
