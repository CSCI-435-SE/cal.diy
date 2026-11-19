# Mutation testing: Issue #137 -- Running late button for host

**PR(s):** [#144](https://github.com/CSCI-435-SE/cal.diy/pull/144)  **Tool:** StrykerJS 10.1.1 with the Vitest runner  **Config:** [stryker.137.config.mjs](../../../stryker.137.config.mjs) + [vitest.stryker-137.config.mts](../../../vitest.stryker-137.config.mts), built on the shared [stryker.config.mjs](../../../stryker.config.mjs) by @zach-short and following the per-issue layout of `stryker.138.config.mjs` by @lexzach  **Command:** `STRYKER_JSON=docs/sprint3/mutation/reports/137-kojoshuay-<before|after>.json TZ=UTC nvm exec 22 node_modules/.bin/stryker run stryker.137.config.mjs`
**Reports:** [before](reports/137-kojoshuay-before.json) · [after](reports/137-kojoshuay-after.json)
**Mutation score:** before 89.22% → after 98.04%
**Note:** line numbers below refer to commit `974a231`. After review, `sendNotice` returns `recipientCount` instead of `sent`, so a few lines moved.


## Surviving mutants

All 11 survivors from the before report are in lines this PR added.

| Location (file:line) | Mutation | Equivalent or test gap? | Why |
|---|---|---|---|
| `RunningLateService.ts:64` | `if (recipients.length === 0) return { sent: 0 }` → `if (false)` | Equivalent | Without the early return, `Promise.allSettled([])` resolves to `[]`, no email is built, nothing is logged, and the method still returns `{ sent: 0 }`. The behavior is the same; the early return only skips work. |
| `RunningLateService.ts:72` | `getTranslation(locale, "common")` → `getTranslation(locale, "")` | Test gap (killed after) | The `running_late_*` email strings are in the `common` namespace. With any other namespace the attendee's email would show raw keys. The test's `getTranslation` mock ignored its second argument, so nothing checked the namespace. |
| `RunningLateService.ts:87` | `if (failures.length > 0)` → `if (true)` | Test gap (killed after) | Would log an error after every successful send. No test checked that a clean send logs nothing. |
| `RunningLateService.ts:87` | `if (failures.length > 0)` → `if (false)` | Test gap (killed after) | Emails that fail before sending (loading translations or building the email) would go unlogged. The method swallows these failures so the host's request still succeeds, so this log is the only record of them. SMTP failures never reach it: `BaseEmail.sendEmail` logs and swallows those itself. No test checked it. |
| `RunningLateService.ts:87` | `failures.length > 0` → `failures.length <= 0` | Test gap (killed after) | Logs only when nothing failed: the opposite of the intent. Same missing assertions as the two rows above. |
| `RunningLateService.ts:87` | `failures.length > 0` → `failures.length >= 0` | Test gap (killed after) | Always logs, like `if (true)`. |
| `RunningLateService.ts:87` | `if` body → `{}` | Test gap (killed after) | Removes the log entirely, like `if (false)`. |
| `RunningLateService.ts:88` | log message → `` ` ` `` (empty) | Test gap (killed after) | The message is how on-call staff find which booking's emails failed. No test checked its content. |
| `RunningLateService.ts:88` | `{ reasons: [...] }` → `{}` | Test gap (killed after) | Drops the failure reasons (for example "SMTP down") from the log. Not asserted. |
| `RunningLateService.ts:89` | `(failure) => String(failure.reason)` → `() => undefined` | Test gap (killed after) | Logs `[undefined]` instead of the reasons. Not asserted. |
| `bookingActions.ts:192` | `booking.loggedInUser?.userId` → `booking.loggedInUser.userId` | Equivalent | `loggedInUser` is a required (non-optional) field of `BookingItemProps` (`apps/web/components/booking/types.ts:12`), so it is never `undefined` and `?.` behaves exactly like `.`. A test with no `loggedInUser` would have to break the type to build that input. |

## New or strengthened test

Commit: [PR #144](https://github.com/CSCI-435-SE/cal.diy/pull/144/files) · Test: `packages/features/bookings/services/RunningLateService.test.ts` › keeps sending to other attendees when one email fails · Kills: `RunningLateService.ts:87` (`if (false)`)

## Questions

**1. What did the surviving mutants reveal about your tests?**

The suriving mutants revealed that my tests checked what the code returned, but there was a gap in testing dependencies. There were two main blind spots in RunningLateService.test.ts:

1) sendNotice is the backend service method in RunningLateService that is run when the host clicks the Running Late button on a booking. It sends an email to each attendee of the event, logs errors from building an email (SMTP errors are logged by the shared email class instead), and at the time returned the number of emails it counted as sent. In my original code, the tests checked that sendNotice returned that count, but the tests did not check the server log errors. This means that if someone tried to break or delete the log later there would be no warning from the tests. 

2) The convention in this Cal codebase to translate text is to use the getTranslation function. This function nees two arguements: local (the attendee's langauge) and "common" (the namespace of what translation file to load). To test this, a mock helper was created so the test does not nee to load the real translation file from the disk. However, the fake function only accpeted the locale parameter and did not accept the namespace parameter. The gap is that the test was too forigving. The test passes on whatever namespace is, even if it is broken. 

**2. Did any surviving mutant point to an assertion whose expected value was not based on the requirements? Explain.**

The gap #2 mentioned in the previos question answers this question. The original test had the assertion: 

expect(ana.t("running_late")).toBe("ja:running_late");

However, the requirements does not say that emails should output "ja:running_late". The actual requreiemnt is that each attendee gets the email in their own language using Cal.com's real translations, what are in the "common" namsespace. 

**3. If you used AI to configure the tool, analyze survivors, or write tests, what did it produce and what did you verify or correct?**

I used Claude Code.

- **Configuration:** it cherry-picked @zach-short's shared Stryker setup onto my branch and wrote `stryker.137.config.mjs` and `vitest.stryker-137.config.mts` from @lexzach's issue-138 versions. It read the commit diff to find the exact line range my PR added to `bookingActions.ts`.
- **Running:** the machine's default Node is 20, and Stryker 10 needs Node 22, so it installed Node 22 with nvm and ran Stryker through `nvm exec 22`.
- **Analysis:** it classified the 11 survivors.
- **Tests:** it wrote the strengthened tests.
1) keeps sending to other attendess when on emails fails:
  - Strengthed the test to also check for service logs the booking ID and exact fail reason. This is to record in the server of emails that were not sent

2) does not log an error when every email sends:

- this is a new test verify that there is no error log message for when all emails were sent succesfully.

3) uses each attendee's own locale and time zone

- Before, this test ignored which translation file the service asked for. Strengthend to now asking for the "common" translation fie so the email has real words, not raw keys. 

- **Verified:**
  - The three selected test files passed before mutation (87 tests), and again after the change (88 tests).
  - Both reports contain the same 108 mutants at the same locations.
  - All 9 "test gap" survivors show as Killed in the after report.
  - The scores in this file match Stryker's summary table (91/102 = 89.22%, 100/102 = 98.04%).
- **Checked the equivalence claims:**
  - `loggedInUser` really is a required field in `types.ts`.
  - With an empty recipient list, the code after the early return produces `{ sent: 0 }` with no side effects.

For human verification of myself, I read over the report to understand the gaps by myself. I also manually ran the test files on my laptop to make sure all tests passed. Additionaly, I checked the git diff to confirm Claude only modified RunningLateService.test.ts. over the report to understand the gaps by myself. I also manually ran the test files on