import baseConfig from "./vitest.config.mts";

// Mutation testing for issue #138 (see stryker.138.config.mjs). Stryker's `related` mode would also run every
// test that imports BookingRepository, including slow, unrelated suites that can time out and stop the run,
// so the tests that exercise this issue's code are listed explicitly instead.
export default {
  ...baseConfig,
  test: {
    ...baseConfig.test,
    include: [
      "packages/trpc/server/routers/viewer/bookings/confirm.handler.individual.test.ts",
      "packages/trpc/server/routers/viewer/bookings/getRecurringOccurrences.handler.test.ts",
      "packages/trpc/server/routers/viewer/bookings/getRecurringOccurrences.schema.test.ts",
      "packages/features/bookings/repositories/BookingRepository.test.ts",
      "apps/web/components/dialog/__tests__/ManageOccurrencesDialog.test.tsx",
      "apps/web/components/booking/__tests__/useBookingConfirmation.test.tsx",
    ],
  },
};
