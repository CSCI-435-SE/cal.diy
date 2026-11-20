// Mutation testing for issue #146 (Sprint 3, D6). Builds on the shared stryker.config.mjs by zach-short and
// follows the per-issue layout (explicit test list, `file:N-N` line ranges) of stryker.138/139.config.mjs.
// Git Bash, Node >= 22:
//   TZ=UTC STRYKER_JSON=docs/sprint3/mutation/reports/146-dchan01-wm-<before|after>.json \
//     node node_modules/@stryker-mutator/core/bin/stryker.js run stryker.146.config.mjs

import process from "node:process";
import baseConfig from "./stryker.config.mjs";

/** @type {import("@stryker-mutator/api/core").PartialStrykerOptions} */
export default {
  ...baseConfig,
  // Only the code #146 changed that unit tests reach. signup-view.tsx, auth/error/page.tsx and the two
  // getServerSideProps files have no unit tests for these lines, so their mutants would all be NoCoverage.
  mutate: [
    "apps/web/modules/auth/lib/authErrorMessages.ts",
    "apps/web/modules/auth/lib/oidcLoginButtons.ts",
    "apps/web/modules/auth/login-view.tsx:132-134",
    "apps/web/modules/auth/login-view.tsx:162-162",
    "apps/web/modules/auth/login-view.tsx:181-184",
    "apps/web/modules/auth/login-view.tsx:244-264",
    "apps/web/modules/auth/login-view.tsx:341-343",
  ],
  vitest: {
    configFile: "vitest.stryker-146.config.mts",
    related: false,
  },
  jsonReporter: { fileName: process.env.STRYKER_JSON ?? "reports/mutation/146.json" },
  htmlReporter: { fileName: "reports/mutation/146.html" },
};
