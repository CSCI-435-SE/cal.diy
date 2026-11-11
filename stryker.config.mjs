// Mutation testing for Sprint 3 (D6). Run it on the files your PR changed, never on the whole repo:
//   TZ=UTC yarn stryker run --mutate "path/to/file.ts"
// Set STRYKER_JSON to write the JSON report where the course wants it, for example
//   STRYKER_JSON=docs/sprint3/mutation/reports/130-zach-short-before.json
/** @type {import("@stryker-mutator/api/core").PartialStrykerOptions} */
export default {
  testRunner: "vitest",
  plugins: ["@stryker-mutator/vitest-runner"],
  vitest: {
    configFile: "vitest.config.mts",
    // Only the tests that import the mutated file run, which keeps a run to minutes in this monorepo.
    related: true,
  },
  // Not inPlace: in this repo the in-place backup lands inside the project, Vitest then collects the backup
  // copies, and the restore drops the executable bit on scripts. The sandbox copy avoids both. These folders
  // have no unit tests that features or web code import, so leaving them out keeps the copy small.
  // .claude and .cursor hold symlinks to folders, and packages/prisma/.env links to a root .env that may not
  // exist; the sandbox copy fails on all three.
  ignorePatterns: [
    "docs",
    "ai-logs",
    "specs",
    "apps/api/v2",
    "apps/web/public",
    "packages/embeds",
    "reports",
    ".claude",
    ".cursor",
    "packages/prisma/.env",
  ],
  ignoreStatic: true,
  concurrency: 4,
  timeoutMS: 30000,
  reporters: ["clear-text", "progress", "json", "html"],
  jsonReporter: { fileName: process.env.STRYKER_JSON ?? "reports/mutation/mutation.json" },
  htmlReporter: { fileName: "reports/mutation/mutation.html" },
};
