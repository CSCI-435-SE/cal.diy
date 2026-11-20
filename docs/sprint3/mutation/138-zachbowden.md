# Mutation testing: Issue #138 -- Allow hosts to confirm or reject individual recurring booking occurrences

**PR(s):** [#140](https://github.com/CSCI-435-SE/cal.diy/pull/140)  **Tool:** StrykerJS 10.1.1 with the Vitest runner  **Config:** [stryker.138.config.mjs](../../../stryker.138.config.mjs) + [vitest.stryker-138.config.mts](../../../vitest.stryker-138.config.mts), built on the shared [stryker.config.mjs](../../../stryker.config.mjs) by @zach-short  **Command:** `STRYKER_JSON=docs/sprint3/mutation/reports/138-zachbowden-<before|after>.json TZ=UTC nvm exec 22 node_modules/.bin/stryker run stryker.138.config.mjs`
**Reports:** [before](reports/138-zachbowden-before.json) · [after](reports/138-zachbowden-after.json)
**Mutation score:** before 50.60% → after 81.71% (covered mutants only: 73.68% → 97.10%)

### Setup notes

- **Only the lines this PR added or changed are mutated.** `stryker.138.config.mjs` lists them as line ranges: the new guard in `confirm.handler.ts`, `findByRecurringEventId` in `BookingRepository.ts`, the new lines in `BookingListItem.tsx`, and all of `ManageOccurrencesDialog.tsx` and the two `getRecurringOccurrences` files.
- **The test list is explicit.** `vitest.stryker-138.config.mts` names this PR's test files plus `BookingRepository.test.ts`. The shared config's `related: true` would also run every test that imports `BookingRepository`, including unrelated calendar-subscription suites that time out under load. A failure on the unmutated code stops Stryker before it mutates anything.
- **Stryker 10 requires Node 22 or newer;** the machine's default is Node 20, so the run uses `nvm exec 22`.
- **Same mutants in both runs.** Both runs produced 99 mutants at identical locations, so the reports compare one-to-one.

| Status | Before | After |
|---|---|---|
| Killed | 42 | 67 |
| Survived | 15 | 2 |
| No coverage | 26 | 13 |
| Ignored (static) | 16 | 17 |

## Surviving mutants

All 15 survivors from the before report are in lines this PR added.

| Location (file:line) | Mutation | Equivalent or test gap? | Why |
|---|---|---|---|
| `confirm.handler.ts:187` | `if (!recurringEventId)` → `if (true)` | Test gap (killed after) | The new pending/not-ended guard is meant only for single-booking requests. No test sent a bulk request whose first booking fails the guard, so applying it to bulk requests went unnoticed. Under the mutant, "Confirm all" on a series whose first booking has ended would be refused. The issue (Q2) says the bulk behaviour must not change. |
| `confirm.handler.ts:191` | status error message → empty | Test gap (killed after) | Tests checked only `code: "BAD_REQUEST"`. API v2 and email-link callers get this message as their only explanation. The project's error-handling rule requires errors that name the record and the reason. |
| `confirm.handler.ts:194` | `endTime < now` → `endTime <= now` | Equivalent | Only differs when the booking ends at exactly the current millisecond. The AC says "past" without defining that instant, and no test can reliably create that state. |
| `confirm.handler.ts:197` | "already ended" message → empty | Test gap (killed after) | Same as line 191. |
| `getRecurringOccurrences.handler.ts:23` | FORBIDDEN message → empty | Test gap (killed after) | Only the error code was asserted. |
| `getRecurringOccurrences.handler.ts:29` | `booking?.recurringEventId` → `booking.recurringEventId` | Test gap (killed after) | No test for a booking id that does not exist. Under the mutant, the query throws a `TypeError` (shown as a 500 error) instead of `BAD_REQUEST`. |
| `getRecurringOccurrences.handler.ts:32` | "not part of a recurring series" message → empty | Test gap (killed after) | Only the error code was asserted. |
| `ManageOccurrencesDialog.tsx:42` | query input `{ bookingId }` → `{}` | Test gap (killed after) | The tRPC mock ignored its arguments, so nothing checked that the dialog asks for this booking's series (AC1, AC8). |
| `ManageOccurrencesDialog.tsx:43` | `{ enabled: isOpenDialog }` → `{}` | Test gap (killed after) | Nothing checked that the query waits until the dialog is open. Under the mutant, every recurring row on the page would fetch its series on load. |
| `ManageOccurrencesDialog.tsx:51` | title → empty | Test gap (killed after) | No test asserted the dialog title (AC1, AC10). |
| `ManageOccurrencesDialog.tsx:52` | description → empty | Test gap (killed after) | Same as line 51. |
| `ManageOccurrencesDialog.tsx:60` | `occurrences?.map` → `occurrences.map` | Test gap (killed after) | The tests always supplied data. If the query errors (no data, not loading), the mutant crashes the dialog. |
| `ManageOccurrencesDialog.tsx:63` | `endTime >= now` → `endTime > now` | Equivalent | Same millisecond boundary as `confirm.handler.ts:194`, on the UI side. |
| `ManageOccurrencesDialog.tsx:74` | date format `"ddd, D MMM YYYY"` → `""` | Test gap (killed after) | AC1 requires the date. Tests used relative dates and only checked status badges, so a wrong date format went unnoticed. |
| `ManageOccurrencesDialog.tsx:77` | `{" "}` in the time range → `""` | Test gap (killed after) | AC1 requires the time. No test checked the rendered time text, so "10:00am -10:15am" would have passed. |

**Mutants with no coverage** (not survivors, but they count against the score):
- **`BookingRepository.ts:685-689`, `findByRecurringEventId` (11 mutants).** The handler test mocks the repository, so the method never ran in any test. A new repository test killed all 11.
- **`ManageOccurrencesDialog.tsx:57`, loading text.** No test rendered the loading state. Killed after.
- **`getRecurringOccurrences.schema.ts:7`, the Zod schema.** No test imported it. The new schema test runs it, but the schema is built when the module first loads, and `ignoreStatic` is on (from the shared config), so the after report lists it as **Ignored** rather than Killed. The new test still checks the schema rejects `{}`, `1.5` and `"5"`.
- **`BookingListItem.tsx:171-172`, `473-483` (13 mutants), still uncovered.** These lines decide when to show the "Manage occurrences" button and open the dialog. No unit test renders a booking row, because the row needs the data-table, actions-store and details-sheet providers. AC1's button placement was checked manually (see PR #140's Test Evidence), but this is still a gap in the automated tests.

## New or strengthened test

Commit: [PR #140](https://github.com/CSCI-435-SE/cal.diy/pull/140/files) · Test: `packages/trpc/server/routers/viewer/bookings/confirm.handler.individual.test.ts` › keeps Confirm all working when the series' first booking has already ended · Kills: `confirm.handler.ts:187` (`if (true)`)

The same change added or strengthened these tests, each killing the mutants listed (all show as Killed in the after report):

| Test | Kills |
|---|---|
| `confirm.handler.individual.test.ts` › refuses to act on a REJECTED / CANCELLED occurrence; refuses to act on an occurrence that has already ended (now also assert the message names the booking and the reason) | `confirm.handler.ts:191`, `:197` |
| `getRecurringOccurrences.handler.test.ts` › throws BAD_REQUEST when the booking does not exist | `getRecurringOccurrences.handler.ts:29` |
| `getRecurringOccurrences.handler.test.ts` › FORBIDDEN and not-recurring cases now also assert the message | `getRecurringOccurrences.handler.ts:23`, `:32` |
| `ManageOccurrencesDialog.test.tsx` › fetches this booking's series only while the dialog is open | `ManageOccurrencesDialog.tsx:42`, `:43` |
| `ManageOccurrencesDialog.test.tsx` › shows the translated title and description | `ManageOccurrencesDialog.tsx:51`, `:52` |
| `ManageOccurrencesDialog.test.tsx` › shows no rows when the query returns no data | `ManageOccurrencesDialog.tsx:60` |
| `ManageOccurrencesDialog.test.tsx` › shows each occurrence's date and time in the host's time zone and time format | `ManageOccurrencesDialog.tsx:74`, `:77` |
| `ManageOccurrencesDialog.test.tsx` › shows a loading message while the occurrences load | `ManageOccurrencesDialog.tsx:57` (was no coverage) |
| `BookingRepository.test.ts` › findByRecurringEventId returns the series' occurrences in chronological order with only the fields needed to act on them | `BookingRepository.ts:685-689` (11, were no coverage) |
| `getRecurringOccurrences.schema.test.ts` (new) | `getRecurringOccurrences.schema.ts:7` (now Ignored as static, see above) |

## Questions

**1. What did the surviving mutants reveal about your tests?**

My tests checked actions, not what the user or caller sees. The handler tests asserted the error code but never the message, which is all an API v2 or email-link caller gets. The dialog tests checked which buttons appear and what they send, but never the date and time AC1 requires, nor the title. Because those tests used dates relative to "now", they could not have asserted a formatted date anyway. The survivors also showed I had only tested the happy path. Nothing covered a booking that doesn't exist, a query with no data, or a bulk request whose first booking is in the past. That last one mattered most. My new guard was meant for single-booking requests, but no test would have caught it also blocking "Confirm all", which the issue says must not change. Finally, the 11 uncovered `BookingRepository` mutants showed that mocking the repository in the handler test meant the real query never ran in any test.

**2. Did any surviving mutant point to an assertion whose expected value was not based on the requirements? Explain.**

Not directly: the survivors came from missing assertions, not wrong expected values. They did force me to decide where some expected values come from. The ACs don't specify error wording, so the new message assertions don't copy the strings from the code. They only require that the message names the booking id and the reason (its status, or that it ended), which comes from the project's documented error-handling rule. For the date/time test, I worked out "Wed, 4 Mar 2099" and "10:00am - 10:15am" for 15:00 UTC in New York independently of the component. The date format matches the one the booking list already uses. The two boundary mutants (`<` vs `<=`, `>=` vs `>`) are the opposite case. The AC says "past" but doesn't define the exact ending instant, so no requirement gives an expected value. That's why I classified them as equivalent rather than adding a test pinned to my own choice.

**3. If you used AI to configure the tool, analyze survivors, or write tests, what did it produce and what did you verify or correct?**

I used Claude Code (log linked from PR #140).

- **Configuration:** it applied @zach-short's shared Stryker setup and wrote the issue-specific config. It mutates only this PR's changed line ranges and lists the test files explicitly, because `related: true` would also pull in calendar-subscription tests that time out.
- **Running:** the first run failed because Stryker 10 requires Node 22 and my machine had Node 20; I installed Node 22 with nvm and ran Stryker through it.
- **Analysis and tests:** it drafted the classification of the 15 survivors and the new tests.
- **What I verified:**
  - All 6 selected test files (36 tests) pass before mutation.
  - The before and after reports contain the same 99 mutants at the same locations.
  - Each "test gap" survivor shows as Killed in the after report.
  - The computed scores match Stryker's own summary table (81.71% / 97.10%).
- **What I corrected:** its first estimate counted the schema mutant as killed, but the after report shows it as Ignored (a static mutant with `ignoreStatic` on). This write-up reports it that way.
