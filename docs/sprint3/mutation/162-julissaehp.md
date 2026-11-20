# Mutation testing: Issue #162 -- Allow hosts to enable or disable the waitlist per event type

**PR(s):** _add the link when the PR is opened_
**Tool:** StrykerJS 10.1.1 with the Vitest runner
**Config:** [stryker.162.config.mjs](../../../stryker.162.config.mjs) and [vitest.stryker-162.config.mts](../../../vitest.stryker-162.config.mts), built on the shared [stryker.config.mjs](../../../stryker.config.mjs) by @zach-short (PR #135)
**Command** (Git Bash; Stryker 10 needs Node 22, and this machine's nvm has no `exec`):
`TZ=UTC STRYKER_JSON=docs/sprint3/mutation/reports/162-julissaehp-<before|after>.json "$LOCALAPPDATA/Author Software/nvm/installs/v22.23.5/node.exe" node_modules/@stryker-mutator/core/bin/stryker.js run stryker.162.config.mjs`
**Reports:** [before](reports/162-julissaehp-before.json) · [after](reports/162-julissaehp-after.json)
**Mutation score:** before 94.74% → after 97.37% (covered mutants only: the same, since no mutant was uncovered)

### Setup notes

- **Only the executable lines #162 added or changed are mutated: 38 mutants in 3 files.**
  - `WaitlistService.ts` 58-60, 102-104 and 144-146 (the three gates), `WaitlistRepository.ts` 114, 122 and 128-131
    (reading the flag from `metadata`), `EventAdvancedTab.tsx` 1264-1280 (the toggle) and `zod-utils.ts` 160 (the
    schema key).
  - `zod-utils.ts:160` (`disableWaitlist: z.boolean().optional()`) is in scope but produced **0 mutants**: no Stryker
    mutator changes a chain of method calls like this. That's why the reports list 3 files. The test that guards it
    was checked by hand instead (see below).
  - `common.json` is left out: Stryker can only mutate JavaScript and TypeScript.
- **The test list is explicit.**
  - The before run used the 3 test files that run the mutated code: `WaitlistService.test.ts`,
    `WaitlistRepository.test.ts` and `EventAdvancedTab.test.tsx` (68 tests).
  - The after run adds `packages/prisma/zod-utils.test.ts` with the new schema tests (102 tests in 4 files).
  - `AvailableTimes.test.tsx` has new tests for this issue but runs none of the mutated code (the booking page is
    unchanged), so it isn't listed.
  - The mutated code did not change between the runs. Both reports contain the same 38 mutants at identical locations,
    checked by comparing file, position, mutator and replacement.
- **`@calcom/features` is aliased into the sandbox,** as in #154's config. Without it, tests importing
  `@calcom/features/...` run the original, unmutated files through `node_modules`.
- **Stryker 10 requires Node 22 or newer**, and this machine's default is Node 20. Node 22 is called by its full path,
  and Stryker's `bin/stryker.js` is run directly because `node_modules/.bin/stryker` would start under Node 20.
- **Nothing was committed between the runs.** Both ran on the uncommitted working tree on top of `team/main`
  `f96d6a33da`. The exact diffs are kept outside the repo as `pr-drafts/issue-162-d6-before-tree.patch` and
  `issue-162-d6-after-tree.patch`; between them only test files and the Vitest test list changed.
- **Credits:**
  - @zach-short: the shared config (#135) and the `file:N-N` single-line form.
  - @zachbowden: per-issue configs, Node 22, the `@calcom/features` alias and this template (#140, #157).

| Status | Before | After |
|---|---|---|
| Killed | 36 | 37 |
| Survived | 2 | 1 |
| No coverage | 0 | 0 |
| Ignored (static) | 0 | 0 |
| Timeout | 0 | 0 |
| Errors | 0 | 0 |
| **Total** | 38 | 38 |

Between the runs, 1 survivor became Killed. No mutant that was Killed before survived after.

## Surviving mutants

Both survivors from the before report are on lines #162 added. The second one is still Survived in the after report.

| Location (file:line) | Mutation | Equivalent or test gap? | Why |
|---|---|---|---|
| `WaitlistService.ts:59` | the `Forbidden` message `` `The waitlist is turned off for event type ${input.eventTypeId}` `` → `` `` `` | Test gap (killed after) | `POST /api/waitlist` is public, and an API caller only gets the error message back (AC "Direct API requests to join a disabled waitlist are rejected"). With an empty message they'd get a 403 with no reason. My test checked the error code but not the message. |
| `EventAdvancedTab.tsx:1270` | `toggleSwitchAtTheEnd={true}` → `false` | Test gap (**not** killed) | Not equivalent: the switch would move to the left of the title, unlike the neighbouring Advanced-tab toggles. But it is purely visual, and no requirement fixes the layout beyond "reuse the existing `SettingsToggle`". A test would have to assert `SettingsToggle`'s internal markup order, which only copies the current code. Left as a documented gap; the visual check is part of the manual testing. |

## New or strengthened test

Commit: _add when committed_ · Test: `packages/features/waitlist/services/WaitlistService.test.ts` › when the host turns the waitlist off › rejects joining with Forbidden and adds no entry, and accepts joining once turned back on (now also asserts the message) · Kills: `WaitlistService.ts:59` (message → empty)

The same change added the tests below. Two of them close gaps that mutation testing could not show; they came from
checking every acceptance criterion against the test list and from the 0-mutant schema line.

| Test | Kills | Source of expected value |
|---|---|---|
| `WaitlistService.test.ts` › rejects joining with Forbidden … (message asserted) | `WaitlistService.ts:59` | AC (Attendee 3, "direct API requests … are rejected") and docs (HTTP 403 means the server refuses the request; the body should say why) |
| `WaitlistService.test.ts` › only affects the event type it was turned off for | none (no surviving mutant behind it) | AC (Host 3, "independently for each event type") and other (the issue's User Scenario: Office Hours keeps its waitlist, Individual Consultations turns it off). Found while mapping ACs to tests: no test used a second event type. The fake repository now knows a second event type (id 3) and the switch takes an event type id. |
| `zod-utils.test.ts` › EventTypeMetaDataSchema disableWaitlist › keeps disableWaitlist: true / false when event type metadata is saved; accepts metadata without the setting; rejects a value that isn't a boolean | none (the line yields no mutants). Deleting `disableWaitlist` from the schema by hand made 3 of the 4 tests fail; the line was then restored. This only shows the test can fail. It isn't D6 mutation evidence (the assignment says manual mutation doesn't count); the D6 kill is `WaitlistService.ts:59` above. | AC (Host 4, "the setting persists after saving") and upstream behavior (the event-type update parses `metadata` with `EventTypeMetaDataSchema`, and a zod object drops keys it doesn't list, so without this key the save would silently lose the setting) |

## Questions

**1. What did the surviving mutants reveal about your tests?**

Less than the gaps they couldn't see. The before score was already 94.74%: each gate (`join`, `getBookedTimes`,
`offerSpot`) had tests with the waitlist both off and back on, so every condition and early return was killed. The one
real survivor showed that I tested *that* a disabled join fails but not *what the caller is told*, which matters
because the endpoint is public. The other survivor is layout only.

The more useful lesson was what Stryker can't see. The most important line for persistence,
`disableWaitlist: z.boolean().optional()`, produced no mutants at all, and none of my tests went through that schema.
If someone removed the key, every test would still pass while hosts' saves silently dropped the setting. Mapping each
acceptance criterion to a named test also found a gap no mutant pointed to: nothing showed the setting is per event
type. A high mutation score here meant "the lines I changed are checked", not "the requirements are checked".

**2. Did any surviving mutant point to an assertion whose expected value was not based on the requirements? Explain.**

No. Neither survivor came from a wrong expected value; both came from missing assertions.
- **The message.** The new assertion expects the exact message. Its wording is mine, not the issue's; what the
  requirement gives is that a direct API join is rejected and that the caller can tell why (403 plus a reason). I
  assert the full text so that an empty or misleading message fails, and would accept changing the test if the
  wording changes.
- **The layout survivor.** No requirement gives an expected value, so I documented it instead of writing a test that
  only copies the current markup.
- **The other new tests** take their expected values from the ACs, the issue's User Scenario, or upstream behavior
  (zod dropping unknown keys), as listed in the table.

**3. If you used AI to configure the tool, analyze survivors, or write tests, what did it produce and what did you verify or correct?**

I used Claude Code (log in `ai-logs/sprint3/julissaehp/`, linked from the PR).

- **Configuration:** it wrote `stryker.162.config.mjs` and `vitest.stryker-162.config.mts` from #154's config,
  limited to this issue's changed lines.
- **Analysis and tests:** it classified the 2 survivors and wrote the 3 after-round changes above.
- **What Claude Code checked:**
  - all listed tests pass on the unmutated code before each run (68, then 102);
  - the two reports contain the same 38 mutants, compared mutant by mutant (file, line, column, mutator,
    replacement), and the only status change is `WaitlistService.ts:59` Survived → Killed;
  - the schema test fails when the schema key is deleted by hand, since Stryker makes no mutant there (a check on
    the test, not part of the D6 score).
- **What I verified:**
  - I read the production diff (the schema key, the repository's metadata read, the three service gates and the toggle).
  - I read the new tests and checked their expected values against the #162 acceptance criteria.
  - I re-ran the waitlist and Advanced-tab test suites myself.
  - I compared the before and after JSON reports with this write-up: the scores and the killed `WaitlistService.ts:59`
    mutant match.
  - I checked the feature by hand in the browser on my local dev server (with my own account and event types): all 7
    manual checks in the PR's Test Evidence passed.
