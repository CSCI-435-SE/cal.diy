import baseConfig from "./vitest.config.mts";

// Mutation testing for issue #146 (see stryker.146.config.mjs). Only the tests written for #146 run, so a slow,
// unrelated suite cannot time out and stop the run. apps/web/modules/test-setup.ts is deliberately not loaded:
// under this root config its @calcom/lib/constants mock applies and lacks WEBAPP_URL, which login-view needs.
export default {
  ...baseConfig,
  test: {
    ...baseConfig.test,
    include: [
      "apps/web/modules/auth/lib/authErrorMessages.test.ts",
      "apps/web/modules/auth/lib/oidcLoginButtons.test.ts",
      "apps/web/modules/auth/login-view.test.tsx",
    ],
  },
};
