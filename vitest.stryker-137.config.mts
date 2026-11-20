import baseConfig from "./vitest.config.mts";

// Mutation testing for issue #137 (see stryker.137.config.mjs). The tests that exercise this issue's code are
// listed explicitly so Stryker's `related` mode doesn't pull in slow, unrelated suites that import the same modules.
export default {
  ...baseConfig,
  test: {
    ...baseConfig.test,
    include: [
      "packages/features/bookings/lib/runningLate.test.ts",
      "packages/features/bookings/services/RunningLateService.test.ts",
      "apps/web/components/booking/actions/bookingActions.test.ts",
    ],
  },
};
