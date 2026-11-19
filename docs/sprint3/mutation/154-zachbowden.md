# Mutation testing: Issue #154 -- Multi seat event waitlist

**PR(s):** [#157](https://github.com/CSCI-435-SE/cal.diy/pull/157)  **Tool:** StrykerJS 10.1.1 with the Vitest runner  **Config:** [stryker.154.config.mjs](../../../stryker.154.config.mjs) + [vitest.stryker-154.config.mts](../../../vitest.stryker-154.config.mts), built on the shared [stryker.config.mjs](../../../stryker.config.mjs) by @zach-short  **Command:** `STRYKER_JSON=docs/sprint3/mutation/reports/154-zachbowden-<before|after>.json TZ=UTC node_modules/.bin/stryker run stryker.154.config.mjs` (Node 22)
**Reports:** [before](reports/154-zachbowden-before.json) · [after](reports/154-zachbowden-after.json)
**Mutation score:** before 70.73% → after 96.57% (covered mutants only: 85.80% → 97.52%)

### Setup notes

- **Only the lines this PR added or changed are mutated.** `stryker.154.config.mjs` lists them as line ranges in `WaitlistService.ts`, `WaitlistRepository.ts`, `handleCancelBooking.ts`, `pages/api/book/event.ts` and `AvailableTimes.tsx`. A single line has to be written as a range (`:120-120`); `:120` alone matches no file and is silently skipped.
- **The test list is explicit.** `vitest.stryker-154.config.mts` names this PR's test files. `related: true` would also run every suite that imports `handleCancelBooking` or `AvailableTimes`.
- **Three pre-existing tests are excluded by name.** The "Correct parameters being passed into handleSeats" tests in `handleSeats.test.ts` spy on the `handleSeats` module's default export. They pass under plain Vitest but fail in Stryker's instrumented sandbox, and a failing test stops Stryker before it mutates anything. They don't run any of this PR's code, so `testNamePattern` skips them.
- **`@calcom/features` is aliased into the sandbox (false "no coverage").** Stryker's sandbox reuses the repo's `node_modules`, where `@calcom/features` is a relative link back to the *original* `packages/features`. `handleSeats.test.ts` imports `handleCancelBooking` as `@calcom/features/...`, so it ran the unmutated file. My first run reported all 14 `handleCancelBooking.ts` mutants as no coverage, even though the seat-cancel tests ran. The Vitest config now aliases `@calcom/features` to the sandbox's own `packages/features`. The committed before report is from the corrected run, so the before/after comparison only changes the tests.
- **Three small source changes between the runs, on the same lines (no lines added or removed).** Every other mutant is at the same location in both reports.
  - **Logging fix:** the new route test found a logging bug (see below). Fixing it removed the `{ error }` object at `event.ts:74` and `handleCancelBooking.ts:85`, and with it one ObjectLiteral mutant each.
  - **`WaitlistService.ts:105`:** `[...attendeesByTime]` became `Array.from(attendeesByTime)`, because `tsc` for `apps/web` rejects spreading a `Map` at its compile target. One mutant changed shape and one was removed.
  - **`handleCancelBooking.ts:72`:** `tsc` also flagged that `bookingToDelete.userId` can be `null` while the task payload requires a number. The guard became `if (!eventTypeId || !hostUserId) return`, which adds two mutants.

| Status | Before | After |
|---|---|---|
| Killed | 144 | 196 |
| Timeout | 1 | 1 |
| Survived | 24 | 5 |
| No coverage | 36 | 2 |
| Ignored (static) | 1 | 1 |
| **Total** | 206 | 205 |

## Surviving mutants

All 24 survivors from the before report are in lines this PR added or changed.

| Location (file:line) | Mutation | Equivalent or test gap? | Why |
|---|---|---|---|
| `AvailableTimes.tsx:344` | `if (!bookedTimes.length) return slots` → never return early | Equivalent | With no booked times, the rest of `mergeByTime` keeps every slot, adds nothing and sorts by time. The server already returns a day's slots in time order, so the result is identical; the early return only skips work. |
| `AvailableTimes.tsx:347` | `isSeatedSlotFull(...) && bookedSet.has(...)` → `\|\|` | Test gap (killed after) | Under the mutant, *every* full seated slot is removed, including one that can't be waitlisted (less than 6 hours away, so not in `bookedTimes`). It would vanish instead of showing "Booking full". AC2 says seated times keep their usual display unless they get the waitlist option. No test had a full slot that wasn't in `bookedTimes`. |
| `AvailableTimes.tsx:349` | open-times mapper → `() => undefined` | Test gap (killed after) | The open-time set becomes `{undefined}`, so a booked time that still has an open slot (a team event booked by one host, free with another) also gets a waitlist button. That's #13's rule ("skip times that are still open"), which my change rewrote, and no test covered it. |
| `AvailableTimes.tsx:350` | `bookedTimes.filter(not open)` → `bookedTimes` | Test gap (killed after) | Same behaviour and same missing test as line 349. |
| `AvailableTimes.tsx:351` (5 mutants) | `timeOf`: arrow → `undefined`; `typeof item === "string"` → `true` / `false` / `!==`; `"string"` → `""` | Test gap (killed after) | Each one breaks the sort key, so the waitlist button no longer lands at its time. No test checked *where* the button appears among the slots. AC1 requires the same placement as for regular events. |
| `AvailableTimes.tsx:352` (3 mutants) | sort removed; comparator → `undefined`; `a - b` → `a + b` | Test gap (killed after) | Same as line 351: the full time's button would move to the end of the list. |
| `WaitlistService.ts:59` | `findActiveBookingAttendeeEmailsAt({ eventTypeId, startTime })` → `({})` | Test gap (killed after) | The fake repository ignored its arguments and returned one global list, so nothing checked that `join` counts the bookings *at the requested time*. The fake now keys bookings by time. |
| `WaitlistService.ts:63` | `bookedEmails?.length` → `bookedEmails.length` | Test gap (killed after) | Joining a seated time with no bookings yet (all seats open) must be a 400 (AC5). Under the mutant it's a `TypeError`, which becomes a 500. No test joined a time with zero bookings. |
| `WaitlistService.ts:98` | `findEventTypeForWaitlist(...)?.seatsPerTimeSlot` → `.seatsPerTimeSlot` | Test gap (killed after) | `GET /api/waitlist/booked-times` is public. An unknown or deleted event type id would throw (500) instead of returning no times. |
| `WaitlistService.ts:116` | `findActiveBookingAttendeeEmailsAt({ eventTypeId, startTime: time })` → `({})` | Test gap (killed after) | Same as line 59, for offers: nothing checked that open seats are counted from the bookings at the freed time. |
| `WaitlistService.ts:117` | `new Set(bookedEmails ?? [])` → `?? ["Stryker was here"]` | Equivalent | Only reached when nothing is booked. The set is used only to ask whether a waitlister's email booked, and `POST /api/waitlist` only accepts valid email addresses, so no entry can match `"Stryker was here"`. The booked-seat count reads `bookedEmails`, not the set. |
| `WaitlistService.ts:118` | `bookedEmails?.length` → `bookedEmails.length` | Test gap (killed after) | When the last attendee cancels, the whole seated booking is cancelled and nothing is booked at that time. Every seat is then open (AC "creates a booking if none exists"). The mutant throws there, so no one would be offered. No test freed a seated time completely. |
| `WaitlistService.ts:134` | `start - now < 6h` → `<= 6h` | Test gap (killed after) | Issue #13's rule: if the event is *closer than* 6 hours out, there is no waitlist, so a slot exactly 6 hours away is still offered. #154 says the six-hour rules must stay unchanged. The service takes an injected clock, so this boundary is testable (unlike #138's real-clock boundaries). |
| `WaitlistService.ts:138` | `if (!eventType) return []` → never | Test gap (killed after) | A cancellation task for an event type deleted before the task runs would crash on `eventType.seatsPerTimeSlot`. The task would then retry and keep failing, instead of offering nothing. |
| `WaitlistService.ts:201` | `eventType?.seatsPerTimeSlot` → `eventType.seatsPerTimeSlot` | Test gap (killed after) | Same, for an offer whose event type is deleted during the 6-hour hold: the expiry task would crash, and the entry would stay `OFFERED` forever. |
| `WaitlistService.ts:223` | `entry.eventTypeId !== input.eventTypeId` → `false` | Test gap (killed after) | With the claim cookie still set, booking a *different* event type at the same start time would release the hold of the seat still offered to them. The test checked the wrong-uid and wrong-time cases, but not the wrong-event-type case. |
| `WaitlistService.ts:224` | `entry.offerStart?.getTime()` → `entry.offerStart.getTime()` | Equivalent | The line before already requires `status === OFFERED`. The only transition into `OFFERED` (`WAITING` → `OFFERED`) always sets `offerStart`, and offer fields are cleared only when moving back to `WAITING`. So `offerStart` is never null here. |
| `handleCancelBooking.ts:72` | `if (!eventTypeId) return` → never | Test gap (**not** killed) | A booking with no event type (or, after the type fix, no host) would queue an `offerWaitlistSpot` task with a `null` id. The task's Zod schema rejects that, so the task fails instead of being skipped. Building such a booking in the booking-scenario test harness was more than this change justified: a seat or regular cancellation needs an event type and host for most of the flow. It stays a known gap. |

**New survivor in the after report:** `handleCancelBooking.ts:72`, `!eventTypeId || !hostUserId` → `&&`. This mutant comes from the type fix above and is the same gap as the row before it: no test cancels a booking that has no event type or host.

**Mutants with no coverage** (not survivors, but they count against the score):
- **`WaitlistRepository.ts` (22 mutants).** The service tests use a fake repository, so the real Prisma queries never ran. A new `WaitlistRepository.test.ts` killed all 22.
- **`event.ts:67-74` (10 mutants).** No test called the booking route. A new `event.test.ts` killed all 9 that remain after the logging fix.
- **`WaitlistService.ts:138`, the `[]` return.** Killed by the deleted-event-type test above.
- **`handleCancelBooking.ts:84-85` (2, still uncovered).** This is the `catch` that logs a failed `tasker.create`. It's logging only, and no test makes the queue fail during a cancellation. Still uncovered.

## New or strengthened test

Commit: [PR #157](https://github.com/CSCI-435-SE/cal.diy/pull/157/files) · Test: `packages/features/waitlist/services/WaitlistService.test.ts` › offers a slot starting exactly 6 hours from now, since only closer slots are excluded · Kills: `WaitlistService.ts:134` (`<` → `<=`)

The same change added or strengthened these tests, each killing the mutants listed (all show as Killed in the after report):

| Test | Kills |
|---|---|
| `WaitlistService.test.ts`: the fake repository now returns bookings per start time (`setBookedAt`) instead of one global list | (makes the next two possible) |
| `WaitlistService.test.ts` › judges a time full by the bookings at that time, not at other times | `WaitlistService.ts:59` |
| `WaitlistService.test.ts` › offers nothing when the freed time is full, even if other times have open seats | `WaitlistService.ts:116` |
| `WaitlistService.test.ts` › rejects joining a seated time that has no bookings yet | `WaitlistService.ts:63` |
| `WaitlistService.test.ts` › reports no booked times for an unknown event type instead of failing | `WaitlistService.ts:98` |
| `WaitlistService.test.ts` › offers every seat when the whole seated booking was cancelled | `WaitlistService.ts:118` |
| `WaitlistService.test.ts` › does not offer a slot of an event type that no longer exists | `WaitlistService.ts:138` (both mutants) |
| `WaitlistService.test.ts` › expires an offer whose event type was deleted during the hold, without offering it again | `WaitlistService.ts:201` |
| `WaitlistService.test.ts` › releases the claimant's hold only after they book the offered time of the offered event (adds the other-event-type case) | `WaitlistService.ts:223` |
| `AvailableTimes.test.tsx` › keeps a full seated time that can't be waitlisted as a 'booking full' slot | `AvailableTimes.tsx:347` |
| `AvailableTimes.test.tsx` › adds no waitlist button for a booked time that is still open | `AvailableTimes.tsx:349`, `:350` |
| `AvailableTimes.test.tsx` › places a full seated time's waitlist button where that time falls in the day | `AvailableTimes.tsx:351` (5), `:352` (3) |
| `WaitlistRepository.test.ts` (new, 4 tests) | `WaitlistRepository.ts:90-93`, `:120`, `:168-178` (22, were no coverage) |
| `pages/api/book/event.test.ts` (new, 3 tests) | `event.ts:67-74` (9, were no coverage) |

**Bug found:** while writing `event.test.ts › still returns the booking, and logs the error, when releasing the hold fails`, the log assertion failed. `safeStringify({ error })` logged `{"error":{}}`, because an `Error` inside an object serializes to `{}` and the message and stack are lost. `safeStringify(error)` handles errors directly. I fixed this in `event.ts` and in the moved `queueWaitlistOffers` helper in `handleCancelBooking.ts`.

## Questions

**1. What did the surviving mutants reveal about your tests?**

They showed three things. First, my fake repository was too forgiving: it ignored its arguments and returned the same bookings for any time. So nothing checked that the service asks about the *right* time. Two survivors (`{ eventTypeId, startTime }` → `{}`) passed only because of that. Second, I had only tested states where data exists. Nothing covered a seated time with zero bookings (both when joining and after the last attendee cancels), an event type deleted while a task is pending, or an unknown event type on the public booked-times endpoint. Each one would have been a crash, not a wrong answer. Third, my UI tests checked *what* appears but not *where*. Eight sort-order mutants survived because no test checked that the waitlist button sits at its own time among the slots. The no-coverage mutants added a fourth point: the repository's real queries and the booking route's hold release had no tests at all. Testing the route then exposed a real logging bug.

**2. Did any surviving mutant point to an assertion whose expected value was not based on the requirements? Explain.**

Not in the existing assertions; the survivors came from missing cases, not wrong expected values. But `WaitlistService.ts:134` made me check where my expected value came from. My existing test ("does not offer slots starting less than 6 hours from now") used a slot 5 hours away, which passes under both `<` and `<=`. The requirement is issue #13's "closer than 6 hours out" (and #154's "six-hour rules remain unchanged"). Under that rule, exactly 6 hours is *not* excluded, so the new test expects an offer there. For the deleted-event-type and unknown-event-type tests, neither issue gives an expected value. Their expected results ("no offer", "no times", "the entry leaves `OFFERED`") come from the general rule that a background task or public endpoint must not crash on missing data, not from what my code returns. Similarly, the repository test's `ACCEPTED`/`PENDING` filter comes from #13's existing definition of an active booking (`findActiveBookingStartTimes`), not from copying the new query.

**3. If you used AI to configure the tool, analyze survivors, or write tests, what did it produce and what did you verify or correct?**

I used Claude Code (log linked from PR #157).

- **Configuration:** it wrote `stryker.154.config.mjs` and `vitest.stryker-154.config.mts` from @zach-short's shared config and my #138 setup, limited to this PR's changed lines.
- **Running:** Stryker failed twice before mutating:
  - single-line ranges like `:120` matched no file, so they had to be written as `:120-120`;
  - three pre-existing `handleSeats` spy tests fail in the sandbox, so they are excluded by name.
- **False "no coverage":** the first successful run reported 0% coverage for `handleCancelBooking.ts`, even though the cancel tests ran. Claude traced this to the sandbox resolving `@calcom/features` to the original files through `node_modules` and added the alias. The committed before report is from that corrected run (the uncorrected run scored 65.85%).
- **Analysis and tests:** it drafted the classification of the 24 survivors and the new tests. One of those tests caught the `safeStringify({ error })` logging bug, which was fixed in the same change.
- **Type errors:** a later `tsc` run on `apps/web` found two type errors in the source and 8 in the new UI tests. It fixed them without changing any line numbers and re-ran the after report.
- **What I verified:**
  - all selected tests pass on the unmutated code (70 passed, 3 skipped by the name filter);
  - every "killed after" mutant shows as Killed in the after report (compared mutant by mutant: file, line, column, mutator, replacement);
  - the only mutants that differ between the reports are the ones from the three source changes listed in the setup notes;
  - the scores match Stryker's own summary (70.73% / 85.80% before, 96.57% / 97.52% after);
  - each equivalent classification holds for every reachable state (for example, that only `WAITING` → `OFFERED` sets the `OFFERED` status, and it always sets `offerStart`).
