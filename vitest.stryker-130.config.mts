import baseConfig from "./vitest.config.mts";

// Mutation testing for issue #130 (see stryker.130.config.mjs). The tests that exercise this issue's code are
// listed explicitly so that a slow, unrelated suite cannot time out and stop the run.
export default {
  ...baseConfig,
  test: {
    ...baseConfig.test,
    include: [
      "apps/web/modules/bookings/lib/formatAwayWindow.test.ts",
      "apps/web/modules/bookings/components/AvailableTimes.test.tsx",
      "apps/web/modules/bookings/components/AvailableTimeSlots.test.tsx",
      "packages/features/schedules/lib/slots.test.ts",
    ],
  },
};
