import baseConfig from "./vitest.config.mts";

// Mutation testing for issue #139 (see stryker.139.config.mjs). The tests written for this issue (PR #142 and
// PR 2) are listed explicitly so that a slow, unrelated suite cannot time out and stop the run.
export default {
  ...baseConfig,
  test: {
    ...baseConfig.test,
    include: [
      "apps/web/modules/event-types/components/tabs/advanced/MinimumCancellationNoticeController.test.tsx",
      "apps/web/modules/event-types/components/tabs/advanced/EventAdvancedTab.test.tsx",
      "packages/platform/atoms/event-types/hooks/useEventTypeForm.test.ts",
      "packages/trpc/server/routers/viewer/eventTypes/__tests__/types.test.ts",
      "packages/features/bookings/lib/minimumCancellationNotice.test.ts",
      "apps/web/app/api/cancel/__tests__/route.test.ts",
      "apps/web/components/booking/__tests__/CancelBooking.minimumCancellationNotice.test.tsx",
      "apps/web/components/booking/actions/bookingActions.test.ts",
      "packages/features/bookings/repositories/BookingRepository.test.ts",
    ],
  },
};
