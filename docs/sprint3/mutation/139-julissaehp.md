# Mutation testing: Issue #139 -- Prevent attendees from cancelling within a set time before a booking

**PR(s):** [#142](https://github.com/CSCI-435-SE/cal.diy/pull/142) (settings UI) and _backend PR for #150, add the link when the PR is opened_ (persistence and enforcement)
**Tool:** StrykerJS 10.1.1 with the Vitest runner
**Config:** [stryker.139.config.mjs](../../../stryker.139.config.mjs) and [vitest.stryker-139.config.mts](../../../vitest.stryker-139.config.mts), built on the shared [stryker.config.mjs](../../../stryker.config.mjs) by @zach-short (PR #135, carried in @zachbowden's PR #140)
**Command** (Git Bash; Stryker 10 needs Node 22, and this machine's nvm has no `exec`):
`TZ=UTC STRYKER_JSON=docs/sprint3/mutation/reports/139-julissaehp-<before|after>.json "$LOCALAPPDATA/Author Software/nvm/installs/v22.23.5/node.exe" node_modules/@stryker-mutator/core/bin/stryker.js run stryker.139.config.mjs`
**Reports:** [before](reports/139-julissaehp-before.json) · [after](reports/139-julissaehp-after.json)
**Mutation score:** before 65.16% → after 79.03% (covered mutants only: 87.45% → 92.45%)

### Setup notes

- **Only the executable lines #139 added or changed are mutated: 313 mutants in 18 files.**
  - This covers both PRs: #142's settings UI, and the backend PR's persistence, enforcement, booking page and bookings list.
  - Imports produce no mutants, so they are left out, as are type-only lines, the `null` default in `defaultEvents.ts` and the test builder.
  - `BookingListItem.tsx` and `BookingActionsDropdown.tsx` are in scope but produced 0 mutants. That's why the reports list 16 files.
- **The test list is explicit.**
  - The before run used the 8 test files written for #139 (175 tests).
  - The after run adds `BookingRepository.test.ts`, which holds the new repository tests, for 9 files and 191 tests. #140 also listed that file.
  - The mutated code did not change between the runs. Both reports contain the same 313 mutants at identical locations, checked by comparing file, position, mutator and replacement.
- **Stryker 10 requires Node 22 or newer**, and this machine's default is Node 20. Node 22 is called by its full path because this nvm has no `exec`.
- **`ignoreStatic` is on** (from the shared config). Values built when a module first loads are reported as Ignored in both runs: `MS_PER_MINUTE` and the error-code string in `minimumCancellationNotice.ts`, and the tRPC input schema.
- **The before run used merge commit `b3be818`, and the after run used `8222569`.** Only test files and the Vitest test list changed in between.
- **Credits:**
  - @zach-short: the shared config (#135); the `file:N-N` single-line form and leaving type-only lines out (#153).
  - @zachbowden: per-issue configs, Node 22, and this template (#140).

| Status | Before | After |
|---|---|---|
| Killed | 202 | 245 |
| Survived | 29 | 20 |
| No coverage | 79 | 45 |
| Ignored (static) | 3 | 3 |
| Timeout | 0 | 0 |
| Errors | 0 | 0 |

Between the runs, 10 survivors and 33 no-coverage mutants became Killed. One no-coverage mutant became Survived: the equivalent `bookingActions.ts:23` fallback, explained below. No mutant that was Killed before survived after.

## Surviving mutants

All 29 survivors from the before report are on lines #139 added or changed. The last row is the one new survivor in the after report.

A mutant is classified as equivalent in two cases. **Logic:** it gives the same result for every input. **Unreachable input:** it would differ only for an input that no part of the system can produce. In that second case the evidence for why the input is impossible is given.

| Location (file:line) | Mutation | Equivalent or test gap? | Why |
|---|---|---|---|
| `minimumCancellationNotice.ts:21` | first guard `(!notice \|\| notice <= 0)` → `false` | Test gap (killed after) | With no notice and a booking that has already started, the mutant computes `msUntilStart < 0` and reports the booking as inside the window. The booking page and the bookings list use this helper, so every in-progress booking on every event type without a notice would lose its Cancel action. #150 AC7 says those event types keep today's behaviour, and `handleCancelBooking` accepts cancellations until the booking ends. My tests only used future start times when the notice was off. |
| `minimumCancellationNotice.ts:21` | `\|\|` → `&&`; `notice <= 0` → `false` (2 mutants) | Equivalent (unreachable input) | Both differ only for a **negative** notice. Every writer rejects negatives: the tRPC input (`int().min(0)`, see `types.test.ts` › rejects -1), the generated Prisma zod schema (`min(0)`), and duplication, which copies validated values. API v2 does not expose the field. |
| `minimumCancellationNotice.ts:21` | `notice <= 0` → `notice < 0` | Equivalent (logic) | A notice of 0 is already caught by `!notice`. |
| `minimumCancellationNotice.ts:42` | `if (!userId)` → `if (false)` | Test gap (killed after) | With no session (`userId` `null`) and a booking whose organizer is `null`, the mutant reaches `null === null` and treats an anonymous visitor as the host, who is exempt. The existing test checked "no session" only for a booking that had an organizer. Today's callers pass `undefined`, but any caller using `?? null` would open this hole. |
| `minimumCancellationNotice.ts:58` | `<` → `<=` (earliest occurrence) | Equivalent (logic) | When two start times are equal, the mutant keeps a `Date` with the same time. Callers only read the time. |
| `minimumCancellationNotice.ts:94` | `\|\|` → `&&`; `notice <= 0` → `false`; `<= 0` → `< 0` (3 mutants) | Equivalent (logic, plus unreachable input) | A missing event type implies a missing notice. A notice of 0 is caught by `!notice`. A negative notice can't be stored, and if it were, `isWithinMinimumCancellationNotice`'s own guard would still return "not within". The only difference is one extra repository query. |
| `route.ts:65` | `session?.user?.id` → `session?.user.id` | Equivalent (unreachable input) | `getServerSession` returns `null` or a session whose `user` is always set (`getServerSession.ts:101-104`). An API caller can't supply a session object. |
| `bookingActions.ts:20` | `loggedInUser?.userId` → `loggedInUser.userId` | Equivalent (unreachable input) | `loggedInUser` is a required field (`types.ts:12`). Both builders (`useBookingListColumns.tsx:135`, `BookingDetailsSheet.tsx:477`) always pass an object. |
| `bookingActions.ts:21` | `booking.user?.id` → `booking.user.id` | Test gap (killed after) | The list query returns `user: null` when the organizer's account no longer exists (`jsonObjectFrom`). The mutant throws while the row's actions are worked out. |
| `EventAdvancedTab.tsx:831` | `if (val)` → `if (true)` | Test gap (not tested) | The mutant also clears the notice when Disable Cancelling is switched **off**. That matters only if an event type has both Disable Cancelling and a notice saved. The UI can't create that state, but the tRPC update accepts both fields in one call. No requirement says what should happen then, and the reschedule setting clears its notice both ways. A test would pin my own choice, so this needs a team decision instead. |
| `MinimumCancellationNoticeController.tsx:20` | `\|\|` → `&&`; `minutes <= 0` → `false`; `<= 0` → `< 0` (3 mutants) | Test gap (killed after) | A saved notice of **0** is valid and means "no notice". The mutants turn it into "0 hours", so choosing the notice option sends 0 instead of the 60-minute default from #142. |
| `MinimumCancellationNoticeController.tsx:20` | `minutes === null` → `false` | Equivalent (logic) | `null <= 0` is `true` in JavaScript, so `null` still takes the default branch. |
| `MinimumCancellationNoticeController.tsx:40` | `&&` → `\|\|`; `value > 0` → `true`; `>` → `>=` (3 mutants) | Test gap (killed after) | A saved 0 would open with the setting switched **on** and "Only when at least…" selected. #139 AC5 says an empty setting has no effect. |
| `MinimumCancellationNoticeController.tsx:40` | `value !== null` → `true` | Equivalent (logic) | `null > 0` is `false`, so the result is the same. |
| `MinimumCancellationNoticeController.tsx:61-62` | container classes → `""`; `isExpanded && "rounded-b-none"` → `true` / `false` / `\|\|` / `""` (5 mutants) | Test gap (not tested) | Visual only: border, padding and corner rounding when the panel opens. No requirement defines these classes, so a test could only copy them from the component. The Sprint 3 rules don't accept the code's own output as an expected value. The styling matches the Disable Rescheduling setting next to it. |
| `MinimumCancellationNoticeController.tsx:99` | `aria-label` → `""` | Test gap (killed after) | The amount field loses its accessible name, so screen readers announce an unlabelled number box. My tests found the field by test id, so they couldn't notice. |
| `MinimumCancellationNoticeController.tsx:110` | `isSearchable={false}` → `true` | Test gap (not tested) | Makes the two-option unit picker typeable. That's a small UX difference with no requirement behind it, so the expected value would come from the code. |
| `MinimumCancellationNoticeController.tsx:115` | `if (option)` → `if (true)` | Equivalent (unreachable input) | The `Select` isn't clearable, so react-select never calls `onChange(null)`. |
| `bookingActions.ts:23` (new survivor; no coverage before) | `: []` → `["Stryker was here"]` | Equivalent (logic) | The new test for a host entry with no user record now reaches this fallback. The mutant puts a string into the host list. A string has no `id` equal to a user id, and no email in the attendee list, so it can never make anyone a host. |

**Totals for the 29 before survivors:** 12 equivalent and 17 test gaps. All 10 gaps that got tests show as Killed in the after report. The other 7 are documented above without a test.

**Mutants with no coverage** (79 before, 45 after; they count against the score):
- **`BookingRepository.ts:693-728`, the two new queries: 33 mutants, all Killed after.** The service tests mock the repository, so the real query arguments never ran. Two new repository tests cover them (below).
- **`bookings-single-view.tsx` (37 mutants), still not covered by unit tests.** These are the booking page's lines:
  - 419–427: the window calculation, including the earliest occurrence for "cancel all remaining" and the host exemption.
  - 886: showing the explanation instead of the cancel form on the `?cancel=true` link.
  - 916 and 922: hiding Cancel.
  - 933–937: the "contact the host" message.

  Rendering this 1,374-line page in a unit test needs about 16 hooks mocked (next-auth, the Next.js router, embeds, tRPC, theming, payments), so it was left out. It was verified manually against `next dev` and the local database, checking the rendered HTML (see the backend PR's Test Evidence):
  - **C1:** an attendee 3 h before a 24 h notice gets the message and no Cancel.
  - **C2:** the same on `?cancel=true`, with no form.
  - **C2b:** 48 h ahead, Cancel is shown.
  - **C2c:** a meeting in progress gets the message.
  - **C9a/C9b:** the host gets Cancel and the form.
  - **D1:** with the flag off, Cancel is shown.
  - **E1:** with the notice cleared, Cancel is shown.

  The page's own "cancel all remaining" path (lines 420–421) was only checked through the server (C8a). That's still a gap in automated testing.
- **`bookingActions.ts:23` "no host list" fallback (1 mutant), unreachable.** The list query's `jsonArrayFrom` always returns an array. The other fallback on this line is covered now (last row above).
- **7 single mutants on data-selection and module-level lines:**
  - the `eventTypeRepository.ts` selects (621, 903)
  - `get.handler.ts:534`, `lib/booking.ts:48`
  - the flag check in `bookings-single-view.getServerSideProps.tsx:142`
  - the `useFlags.ts:28` default and `zod-utils.ts:715`

  Killing these needs integration tests with a real database. They were verified by the manual end-to-end checks: B (save and reload through tRPC), C (booking page), and D (flag off).

## New or strengthened test

Commit: [8222569](https://github.com/CSCI-435-SE/cal.diy/commit/8222569b5e7e8e7476674d4562e4b9715f877e8f) · Test: `packages/features/bookings/lib/minimumCancellationNotice.test.ts` › isWithinMinimumCancellationNotice › keeps a booking that has already started cancellable when the notice is null · Kills: `minimumCancellationNotice.ts:21` (first guard → `false`)

The same commit added the tests below. "Kills" lists the mutants that are Killed by that test in the after report. The source categories are the ones the Sprint 3 Test Evidence rules use.

| Test | Kills | Source of expected value |
|---|---|---|
| `minimumCancellationNotice.test.ts` › keeps a booking that has already started cancellable when the notice is null / undefined / 0 | `minimumCancellationNotice.ts:21` (guard → `false`) | AC (#150 AC7) and upstream behavior (`handleCancelBooking` accepts cancellations until the booking ends) |
| `minimumCancellationNotice.test.ts` › does not treat a visitor without a session (null / undefined) as host when the booking has no organizer | `minimumCancellationNotice.ts:42` | AC (#150 AC6) and issue discussion (#150: hosts are identified by the session, never by `cancelledBy`) |
| `MinimumCancellationNoticeController.test.tsx` › treats a saved notice of 0 as no notice | `MinimumCancellationNoticeController.tsx:20` (×3), `:40` (×3) | AC (#139 AC5 "no effect when it's empty") and other (#142's reviewed default of 60 minutes) |
| `MinimumCancellationNoticeController.test.tsx` › gives the amount field an accessible name | `MinimumCancellationNoticeController.tsx:99` | AC (#139 AC1 names the setting) and docs (WCAG 2.1 SC 4.1.2, Name, Role, Value) |
| `bookingActions.test.ts` › still disables cancel for an attendee when the organizer's account no longer exists | `bookingActions.ts:21` | AC (#150 AC3/AC4) and upstream behavior (the list's reschedule rule already handles `booking.user` being `null`) |
| `bookingActions.test.ts` › keeps blocking an attendee when a host entry has no user record | none: covers `bookingActions.ts:23`, which is equivalent once covered | AC (#150 AC6) |
| `BookingRepository.test.ts` › findFirstActiveRecurringBookingFromDate › asks for the series' earliest active occurrence starting at or after the given time | `BookingRepository.ts:693-709` (10, were no coverage) | Issue discussion (#150: the earliest upcoming active occurrence decides "cancel all remaining") and upstream behavior (`getActiveRecurringBookingsFromDate` defines "active": ACCEPTED/PENDING, from a date, earliest first) |
| `BookingRepository.test.ts` › findByUidIncludeAttendeesAndEventTypeHosts › selects only what the minimum cancellation notice and host checks need; returns null for an unknown booking | `BookingRepository.ts:711-728` (23, were no coverage) | Issue discussion (#150's host rule and window inputs) and docs (CLAUDE.md: "only select data you need") |

## Questions

**1. What did the surviving mutants reveal about your tests?**

They showed that I tested the feature where I expected it to act, but not where it must stay out of the way.

- **"Off" was only tested in the future.** Every test for "no notice" used a booking in the future. So nothing noticed that one guard was all that kept an in-progress booking cancellable on the many event types without a notice. That case covers almost every existing event type, and it is exactly what #150 AC7 protects.
- **Authorization was tested only on the happy path.** "No session" was tested only against a booking with an organizer. So nothing checked that an anonymous visitor can't match a booking whose organizer is missing.
- **The UI tests were checked through test ids, not what users get.** No test asked whether a saved 0 shows as "off", or whether the field has an accessible name.
- **The repository queries were never run.** The service tests mocked them, so the 33 mutants on the recurring rule's query had no coverage at all.
- **Most of the 12 equivalent mutants came from my own redundant defensive code.** Examples: `?.` on fields that are always set, and a second `<= 0` check after `isWithinMinimumCancellationNotice` already checks. That pointed to simplifying the code rather than adding tests.
- **The remaining gap is the booking page.** Its 37 lines have no unit test because the page is hard to render in isolation. Its behaviour rests on the manual end-to-end checks, and the score reflects that.

**2. Did any surviving mutant point to an assertion whose expected value was not based on the requirements? Explain.**

Yes.
- **The negative-notice test.** The `||` → `&&` and `notice <= 0` → `false` survivors at `minimumCancellationNotice.ts:21` showed that my existing test "has no effect when the notice is negative" asserts a behaviour no requirement asked for. Negative notices can't be stored, so its expected value came from my implementation. Its start time was also in the future, so it never reached the branch it claims to check.
- **The opposite case.** For the styling survivors and `EventAdvancedTab.tsx:831` (clearing the notice when Disable Cancelling is switched off), the requirements give no expected value at all. I documented them instead of writing tests that would only copy the code's current output, which the Sprint 3 rules reject as an expected-value source.
- **The new tests** take their expected values from the ACs, the #150 discussion, WCAG, or behaviour that already existed upstream (table above).

**3. If you used AI to configure the tool, analyze survivors, or write tests, what did it produce and what did you verify or correct?**

I used Claude Code (log in `ai-logs/sprint3/julissaehp/`, linked from the PR).

- **Configuration:** Claude extended the #142 configuration to include the backend's changed lines and updated the line ranges after merging `main`.

- **Running:** Claude performed the dry runs and both official mutation testing runs.

- **Analysis:** Claude analyzed all 29 surviving mutants, proposed test improvements, and implemented the strengthened tests after my approval.

- **What I verified:**
  - I reviewed the reported results showing that all 191 selected tests passed on Node 20 and Node 22.
  - I reviewed the before and after results to confirm that both runs used the same scope of 313 mutants.
  - I reviewed the mutation score improvement from 65.16% to 79.03% and the covered-only improvement from 87.45% to 92.45%.
  - I reviewed and approved the eight proposed test improvements before implementation.
  - I verified the changed files through Git and manually committed the baseline reports and strengthened tests separately.
  - I reviewed the sources of expected values to ensure the tests were based on requirements, documented decisions, or upstream behavior.

- **What was corrected:**
  - **`EventAdvancedTab.tsx:831`:** The initial analysis classified this mutant as equivalent. Further investigation showed that the API could create the relevant state. It was reclassified as a test gap requiring a team decision rather than inventing an expected behavior.
  - **`bookingActions.ts:23`:** The initial analysis predicted that the new test would kill additional mutants. The after run showed that one newly covered mutant survived and was classified as equivalent. The test was retained because it verifies meaningful behavior when a host entry has no user record.