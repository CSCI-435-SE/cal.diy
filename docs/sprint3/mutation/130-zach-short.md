# Mutation testing: Issue #130, show the hours of a partial-day out-of-office window

**PR:** [#153](https://github.com/CSCI-435-SE/cal.diy/pull/153)  **Tool:** StrykerJS 10.1.1 with the Vitest runner  **Config:** [stryker.130.config.mjs](../../../stryker.130.config.mjs) and [vitest.stryker-130.config.mts](../../../vitest.stryker-130.config.mts), built on the shared [stryker.config.mjs](../../../stryker.config.mjs) by @zachbowden (PR #140)  **Command:** `STRYKER_JSON=docs/sprint3/mutation/reports/130-zach-short-<before|after>.json TZ=UTC node_modules/.bin/stryker run stryker.130.config.mjs`
**Reports:** [before](reports/130-zach-short-before.json), [after](reports/130-zach-short-after.json)
**Mutation score:** before 82.67% to after 98.67% (covered mutants only: 88.57% to 98.67%)

### Setup notes

Only the lines PR #153 added or changed are mutated. `stryker.130.config.mjs` lists them as line ranges: all of `formatAwayWindow.ts`, the panel logic in `AvailableTimes.tsx` (the `inSamePanel` check, the whole-day test, the run loop and the `awayWindow` value), the toggle line in `AvailableTimeSlots.tsx`, the hours line in `OutOfOfficeInSlots.tsx` and the two new slot fields in `slots.ts`. Type-only lines and imports produce no mutants.

Stryker reads a range only in the form `file:start-end`. A single line written as `file:218` matched nothing, so the first before run had no mutants on four changed lines. Those lines are now written as `file:218-218`, and the before report in this folder comes from the corrected run.

The test list is explicit. `vitest.stryker-130.config.mts` names the test files for this issue, so an unrelated suite cannot time out and stop the run. The before run used three files (96 tests). The after run adds `AvailableTimeSlots.test.tsx` (106 tests in four files). All of them pass on the unmutated code, and each run takes about 17 seconds. The machine runs Node 26, so no `nvm` step is needed.

Both runs produced the same 75 mutants at the same locations, so the reports compare one to one.

| Status | Before | After |
|---|---|---|
| Killed | 62 | 74 |
| Survived | 8 | 1 |
| No coverage | 5 | 0 |
| Ignored (static) | 0 | 0 |

## Surviving mutants

All eight survivors in the before report are in `AvailableTimes.tsx`, in lines this PR added or changed.

| Location (file:line) | Mutation | Equivalent or test gap? | Why |
|---|---|---|---|
| `AvailableTimes.tsx:280` | `other.outOfOfficeStart === slot.outOfOfficeStart` to `true` | Test gap (killed after) | Under the mutant, two touching runs join into one panel when their windows end at the same time. The out-of-office form does not stop a user from saving two entries that overlap (the only overlap check in `outOfOfficeCreateOrUpdate.handler.ts` is for redirect loops), so an entry from 09:00 to 15:00 next to one from 13:00 to 15:00 is possible. The second entry's hours, note and redirect would disappear. No test had two windows with the same end. |
| `AvailableTimes.tsx:283` | `oooAllDay` to `false` | Test gap (killed after) | The mutant removes the whole-day early return, so a whole-day entry renders through the run loop inside the slot list wrapper. Before #130 a whole-day day returned the panel alone. The test "keeps the whole-day layout" compared the layout with a second render through the same code, so both renders changed together and the test passed. |
| `AvailableTimes.tsx:283` | `slots.every(...)` callback to `() => undefined` | Test gap (killed after) | Same effect and same cause as the row above. |
| `AvailableTimes.tsx:309` | `merged[index - 1]` to `merged[index + 1]` | Test gap (killed after) | The panel moves from the first slot of a run to the last one. The DOM order stays the same, but the redirect button takes its date from the panel's slot (`dayjs(time).format("YYYY-MM-DD")`). When a run crosses midnight UTC, as it can in a New York attendee's evening, the button sends the attendee to the next day. |
| `AvailableTimes.tsx:311` | `while` condition to `false` | Test gap (killed after) | The run end stays at the first slot, so the last panel of a day loses the `pb-0` class that #104 gives the last panel. No test checked that class. |
| `AvailableTimes.tsx:311` | `merged[runEnd + 1]` to `merged[runEnd - 1]` | Test gap (killed after) | Same effect as the row above: the loop never runs, because line 309 has already ruled out a matching slot before the run. |
| `AvailableTimes.tsx:311` | `runEnd++` to `runEnd--` | Test gap (killed after) | The run end moves backward and stops before the run, so the last panel again loses `pb-0`. |
| `AvailableTimes.tsx:370` | `outOfOfficeStart && outOfOfficeEnd` to `outOfOfficeStart \|\| outOfOfficeEnd` | Equivalent | The two values differ only when a slot has one field and not the other. `slots.ts:261-264` sets both fields from the same window record or sets neither, so no slot the server builds can tell the two apart. A test for a slot with one field would pin a case the requirements do not describe. Still Survived in the after report. |

**Mutants with no coverage** (not survivors, but they count against the score):

- **`AvailableTimeSlots.tsx:218`, the time format toggle (5 mutants).** `Booker.test.tsx` mocks `AvailableTimeSlots`, so no test rendered the header. The PR audit had already listed this line as "not tested automatically". A new test file renders the component with the booker store and checks the toggle for five kinds of day. All five mutants are Killed in the after report.

## New or strengthened test

Commit: [PR #153](https://github.com/CSCI-435-SE/cal.diy/pull/153/files)  Test: `apps/web/modules/bookings/components/AvailableTimes.test.tsx` › renders two panels when two overlapping entries end at the same time  Kills: `AvailableTimes.tsx:280` (`true`)

The same change added these tests, each killing the mutants listed (all show as Killed in the after report):

| Test | Kills |
|---|---|
| `AvailableTimes.test.tsx` › renders a whole-day entry as the panel alone, without the slot list around it | `AvailableTimes.tsx:283` (both) |
| `AvailableTimes.test.tsx` › offers the redirect on the day the run starts when the run crosses midnight UTC | `AvailableTimes.tsx:309` |
| `AvailableTimes.test.tsx` › drops the bottom padding of the last panel of the day, and only there | `AvailableTimes.tsx:311` (all three) |
| `AvailableTimes.test.tsx` › renders every slot and no panel on a day without an away entry | none on its own; it covers the plain day that no test rendered |
| `AvailableTimeSlots.test.tsx` (new) › five toggle cases: bookable day, first slot away, one window over the whole day, whole-day entry, column view | `AvailableTimeSlots.tsx:218` (5, were no coverage) |

The expected values come from the requirements or from the code before #130, not from the new code. The whole-day layout comes from the early return on `main` before the PR. The toggle cases come from the decision on #130 that a day whose away panel has hours keeps the toggle, and from the pre-#130 rule that a whole-day entry and column view hide it. The redirect date is the day the attendee is looking at.

## Questions

**1. What did the surviving mutants reveal about your tests?**

My tests checked what the panel says but not how the day is laid out around it. They asserted the hours, the note and the redirect, so every mutant that changed the text died, while the mutants that changed the wrapper or the last panel's padding lived. The survivors also showed which cases I had never set up: two entries that overlap and end at the same time, an away run that crosses midnight UTC, and the time format toggle. The toggle had no coverage at all, because the only test that renders the booker mocks `AvailableTimeSlots`, so no test ever rendered the line this PR changed.

**2. Did any surviving mutant point to an assertion whose expected value was not based on the requirements? Explain.**

Yes. The test "keeps the whole-day layout" rendered a whole-day entry, saved its layout, and then compared a second render with it. Both renders went through the code under test, so the expected value came from that code and not from how the booker behaved before #130. When the mutant removed the whole-day early return, both renders changed together and the test still passed. The new test takes its expected layout from `main` before the PR, where a whole-day day returns the panel alone with no slot list around it.

**3. If you used AI to configure the tool, analyze survivors, or write tests, what did it produce and what did you verify or correct?**

I used Claude Code for all of the D6 work, and a Fable session wrote the first #130 tests in PR #153. Claude Code applied @zachbowden's shared configuration from PR #140, wrote the #130 config and test list, ran both reports, classified the eight survivors and wrote the new tests. It also found that its first before run had missed four changed lines, because Stryker reads a single line only as `file:218-218`, and it ran the before report again with the corrected ranges.

I read the survivor table and agree with each classification, including the one equivalent mutant. I read the new tests and agree that their expected values come from the requirements or from the code before #130. I opened the before and after reports and confirmed the scores and that both runs have the same 75 mutants.
