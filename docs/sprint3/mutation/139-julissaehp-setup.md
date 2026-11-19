# Issue #139 mutation testing: setup notes (pre-D6)

These are working notes for resuming the D6 mutation testing for issue #139 (Minimum Cancellation Notice). They are
**not** the D6 deliverable. The deliverable will be `139-julissaehp.md` with the before and after reports in
`reports/`. Fold the "Setup notes" and "Credits" sections below into it when it is written.

Status as of 2026-11-19: setup done and verified with a dry run. No official run yet, no reports, no survivor analysis.

## Where the setup lives

- **Branch:** local-only `test/issue-139-mutation`, cut from `feat/issue-139-min-cancellation-notice-ui` (PR #142,
  `cc4ae59fd5`). Nothing is committed or pushed.
- **Shared files, copied unchanged from Zach Bowden's PR #140:**
  - `stryker.config.mjs`
  - the two Stryker dev dependencies in `package.json`
  - the matching `yarn.lock` lines
  - the `.gitignore` entries for `/reports/mutation/` and `.stryker-tmp/`

  PR #140 and PR #142 branch from the same `team/main` commit (`247b769`), so these files carry only the Stryker
  changes. Their diff hashes the same as #140's.
- **Issue-specific files, written for #139:**
  - `stryker.139.config.mjs` holds the mutation scope and report paths.
  - `vitest.stryker-139.config.mts` holds the explicit test list.

## Credits (what was reused)

| From | What I reused |
|---|---|
| Zachary Short, PR #135 (carried in #140) | The shared `stryker.config.mjs`. It sets the Vitest runner, uses a sandbox instead of in-place mutation, and has the ignore list for docs and symlinked folders. It also sets `ignoreStatic`, the JSON/HTML reporters and the `STRYKER_JSON` env var. |
| Zach Bowden, PR #140 | Stryker 10.1.1 as root dev dependencies. A per-issue `stryker.<N>.config.mjs` that mutates only changed line ranges, with `related: false`. A per-issue `vitest.stryker-<N>.config.mts` with an explicit `include` list. Running Node 22 next to a default Node 20. The D6 write-up template. |
| Zachary Short, PR #153 | A single line must be written `file:N-N`; `file:N` matches nothing. Type-only lines are left out of the scope because they produce no mutants. `import process from "node:process"` in the issue config. |

## Mutation scope (PR #142 only, for now)

| File | Lines | Why |
|---|---|---|
| `apps/web/modules/event-types/components/tabs/advanced/MinimumCancellationNoticeController.tsx` | whole file | New in #142 |
| `apps/web/modules/event-types/components/tabs/advanced/EventAdvancedTab.tsx` | `843-843` | The `<MinimumCancellationNoticeSetting />` line. The import on line 74 produces no mutants. |
| `apps/web/modules/feature-flags/hooks/useFlags.ts` | `28-28` | The flag's default `false`. It is a module-level constant, so with `ignoreStatic` it is expected to show as Ignored. Kept in scope on purpose. |

Left out:
- `packages/features/flags/config.ts:29` is a type only, so it has no mutants.
- `common.json` and `migration.sql` are not JavaScript, so Stryker cannot mutate them.

Tests run against the mutants (`vitest.stryker-139.config.mts`):
- `MinimumCancellationNoticeController.test.tsx`
- `EventAdvancedTab.test.tsx`

These are the only test files that reference the feature.

## Windows-specific setup

1. **Node 22 next to Node 20.**
   - Stryker 10.1.1 declares `engines.node >=22.0.0`, and this machine's default Node is 20.20.2.
   - Install it with `nvm install 22`. This installed 22.23.5, and the default stays 20.20.2. Do **not** run `nvm use 22`.
   - This nvm (Author Software nvm v2.0.0) has no `nvm exec`, so Bowden's `nvm exec 22 …` does not work here.
   - Instead, call Node 22's `node.exe` by its full path:
     `%LOCALAPPDATA%\Author Software\nvm\installs\v22.23.5\node.exe`
2. **Run Stryker's JS entry point directly.** Use `node_modules/@stryker-mutator/core/bin/stryker.js`, because
   `node_modules/.bin/stryker` is a shell shim that would pick up the default Node 20.
3. **Install without build scripts.** `yarn install --mode=skip-build` added the 98 Stryker packages and left
   `yarn.lock` unchanged. It also skips the root postinstall, which would regenerate Prisma and app-store files and
   could overwrite uncommitted work.
4. **Set `TZ=UTC` in PowerShell** with `$env:TZ="UTC"`. In Git Bash, a `TZ=UTC` prefix works.
5. **Symlinks.** `CLAUDE.md` (pointing to `AGENTS.md`) is a real symlink here (`core.symlinks=true`). The sandbox copy
   handled it, so no extra ignore pattern was needed. If a future run fails while copying a symlink, add its path to
   `ignorePatterns` in `stryker.139.config.mjs` only.
6. **The progress reporter is downgraded.** Stryker reports that the console does not support `progress` and switches
   to `progress-append-only`. This is harmless.

## Verification done (2026-11-19)

| Check | Command | Result |
|---|---|---|
| Shared files match #140 | `git diff HEAD -- package.json yarn.lock .gitignore` compared with #140's diff | Identical hashes |
| Install | `yarn install --mode=skip-build` | Exit 0, 98 packages added, `yarn.lock` unchanged. Core and vitest-runner are both 10.1.1. |
| Existing tests (Node 20) | `yarn test apps/web/modules/event-types/components/tabs/advanced/MinimumCancellationNoticeController.test.tsx apps/web/modules/event-types/components/tabs/advanced/EventAdvancedTab.test.tsx` | 2 files, 22 tests passed |
| Stryker test list (Node 22) | `TZ=UTC <node22> node_modules/vitest/vitest.mjs run --config vitest.stryker-139.config.mts` | 2 files, 22 tests passed |
| Stryker config (dry run) | `TZ=UTC STRYKER_JSON=reports/mutation/139-dryrun.json <node22> node_modules/@stryker-mutator/core/bin/stryker.js run stryker.139.config.mjs --dryRunOnly` | Found 3 files to mutate, instrumented 51 mutants, 4 runner processes, initial run 22 tests passed. No mutants tested and no report written. |
| No side effects | `git status --short` | Only the expected setup files changed. Uncommitted generated files untouched. `.stryker-tmp/` removed. |

The 51 mutants are the UI-only count. The official scope will be larger once the backend ranges are added.

## Resuming after PR 2 (backend) is done

1. **Move the setup files onto the PR 2 branch.** That PR is where the D6 work gets committed, as #140 and #153 did.
   The files are `stryker.config.mjs`, `stryker.139.config.mjs`, `vitest.stryker-139.config.mts`, and the
   `package.json` / `yarn.lock` / `.gitignore` changes. If #140 or #153 has merged to main by then, take the shared
   files from main and keep only the `stryker.139.*` / `vitest.stryker-139.*` files.
2. **Extend the config with the backend.**
   - Add the backend's changed line ranges to `mutate`, written `file:start-end`. Get them from
     `git diff -U0 team/main...HEAD`.
   - Add the backend test files to `include`.
   - If PR 2 changes the UI lines, refresh the frontend ranges too.
3. **Check the scope before the official runs.**
   - Run `--dryRunOnly` again and record the mutant count.
   - The before and after runs must have the same mutants at the same locations.
4. **Official before run** (PowerShell, from the repo root):
   ```powershell
   $env:TZ="UTC"; $env:STRYKER_JSON="docs/sprint3/mutation/reports/139-julissaehp-before.json"
   & "$env:LOCALAPPDATA\Author Software\nvm\installs\v22.23.5\node.exe" node_modules/@stryker-mutator/core/bin/stryker.js run stryker.139.config.mjs
   ```
5. **Analyze and fix tests.** Classify each survivor, then add or strengthen tests.
6. **Official after run.** Repeat step 4 with `139-julissaehp-after.json`.
7. **Write `docs/sprint3/mutation/139-julissaehp.md`** using the #140/#153 template:
   - a header with tool, config, command and scores;
   - setup notes;
   - a status table;
   - surviving mutants;
   - mutants with no coverage;
   - new tests;
   - the three questions.

   Then remove or merge this file.

Preliminary or experimental runs should leave `STRYKER_JSON` unset (the report goes to `reports/mutation/139.json`)
or point it under `reports/mutation/`. That folder is gitignored, so it never mixes with the official reports.

## AI use (for the Sprint 3 AI log and D6 question 3)

Claude Code did the following in this session:
- read PRs #135, #140, #153 and #142 with `gh`;
- compared the shared and per-issue Stryker and Vitest configs, and confirmed the `yarn.lock` diffs are identical;
- found that Stryker needs Node 22 and that this machine's nvm has no `exec`;
- proposed a scope of only #142's changed lines;
- after approval, created the local branch, copied the shared files from #140, installed the dependencies and Node 22,
  and wrote the two #139 config files;
- ran the existing tests and a Stryker dry run.

What I verified:
- the shared-file diff matches #140;
- `yarn.lock` was unchanged by the install;
- the default Node is still 20;
- the 22 tests pass;
- the dry run found the 3 scoped files;
- my uncommitted work was untouched.

It did not change tests, implement backend code, run mutations, write reports or commit.
