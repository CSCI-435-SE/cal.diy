# Mutation testing: Issue #146 -- [OIDC] Add Provider Buttons to Login/Sign-Up and Handle Authentication Errors

**PR(s):** #TODO (you): PR number  **Tool:** StrykerJS 10.1.1 with the Vitest runner  **Config:** [stryker.146.config.mjs](../../../stryker.146.config.mjs) and [vitest.stryker-146.config.mts](../../../vitest.stryker-146.config.mts), built on the shared [stryker.config.mjs](../../../stryker.config.mjs) by @zach-short (PR #135); the per-issue layout (explicit test list, `file:N-N` ranges) follows @zachbowden's #140 and @julissaehp's `stryker.139.config.mjs`  **Command:** `TZ=UTC STRYKER_JSON=docs/sprint3/mutation/reports/146-dchan01-wm-<before|after>.json node node_modules/@stryker-mutator/core/bin/stryker.js run stryker.146.config.mjs`
**Reports:** [before](reports/146-dchan01-wm-before.json) · [after](reports/146-dchan01-wm-after.json)
**Mutation score:** before 91.78% → after 95.89%

## Surviving mutants

| Location (file:line) | Mutation | Equivalent or test gap? | Why |
|---|---|---|---|
| `apps/web/modules/auth/login-view.tsx:341` | `displayedErrorMessage && <Alert …/>` → `displayedErrorMessage \|\| <Alert …/>` | Test gap (killed in after run) | With an error, the bare string renders instead of the error Alert; with no error, an empty Alert renders. The AC6 tests only looked for the text anywhere on the page, so both passed. |
| `apps/web/modules/auth/login-view.tsx:184` | `isGoogleLoginEnabled \|\| isOutlookLoginEnabled` → `false` | Test gap (killed in after run) | With Google on and no OIDC providers, the social-login block (and the Google button) would disappear. Every test that enabled Google also passed OIDC providers, which kept `showSocialLogin` true. |
| `apps/web/modules/auth/login-view.tsx:184` | `isGoogleLoginEnabled \|\| isOutlookLoginEnabled` → `isGoogleLoginEnabled && isOutlookLoginEnabled` | Test gap (killed in after run) | Same cause: Google on and Outlook off gives `false`, hiding the Google button. |
| `apps/web/modules/auth/login-view.tsx:162` | `setSignInErrorCode(null)` → removed (NoCoverage) | Test gap (still open) | A stale `?error=` alert would stay next to the 2FA prompt after a password sign-in. No unit test submits the credentials form: under the root Vitest config the coss-ui `Input` does not attach react-hook-form's ref ("Function components cannot be given refs"), so typed values never reach the form. A test was tried and removed; this needs an E2E test. |
| `apps/web/modules/auth/login-view.tsx:133` | `searchParams?.get("error")` → `searchParams.get("error")` | Equivalent | `useCompatSearchParams` always returns `new ReadonlyURLSearchParams(...)` and never null (`packages/lib/hooks/useCompatSearchParams.ts:23`), so the optional chain never short-circuits. |
| `apps/web/modules/auth/login-view.tsx:254` | `e.preventDefault()` → removed | Equivalent | `Button` defaults to `type="button"` (`packages/ui/components/button/Button.tsx:229`) and the social buttons are outside the `<form>` (`login-view.tsx:207` vs `:276`), so a click has no default action to prevent. |

## New or strengthened test

Commit: TODO (you): link to the commit with the test changes · Test: `apps/web/modules/auth/login-view.test.tsx` › "shows the translated message for ?error=%s" (now checks inside `getByTestId("alert")`) and "shows no sign-in error without ?error=" (now asserts no alert) · Kills: `login-view.tsx:341`

Commit: TODO (you): same commit · Test: `apps/web/modules/auth/login-view.test.tsx` › "still shows the Google button when Google is the only provider (AC3)" (new) · Kills: both `login-view.tsx:184` mutants

## Questions

1. What did the surviving mutants reveal about your tests?
2. Did any surviving mutant point to an assertion whose expected value was not
based on the requirements? Explain.
3. If you used AI to configure the tool, analyze survivors, or write tests, what
did it produce and what did you verify or correct? If AI was not used, write
"N/A."

### Answers

<!-- TODO (you): these are AI drafts. Check each against the reports and reword them in your own words. -->

1. Both helper modules (`authErrorMessages.ts`, `oidcLoginButtons.ts`) had no survivors, so their table-style tests pin every code-to-message mapping and every button field. All the gaps were in `login-view.tsx`. The tests checked that the right text appeared, but not *where* it appeared (inside the error Alert), and not that nothing rendered when there was no error. Also, every test that turned Google on also passed OIDC providers, so the Google-only path was never exercised. The credentials-submit path (`onSubmit`) has no unit coverage at all.
2. No. The expected values in the tests next to the surviving mutants come from the acceptance criteria, not from the code's output. AC3 says the page looks as before with no OIDC providers. AC6 says the message is shown as an error. The weakness was in what the assertions checked (text anywhere on the page instead of inside the alert), not in where the expected values came from.
3. Claude Code (AI) wrote the two config files, sorted the survivors into equivalent or test gap, and wrote the test changes. I ran both Stryker runs myself. What I checked:
   - the 3 test files pass under the Stryker Vitest config (46 tests);
   - the before and after reports hold the same 109 mutants (compared by file, position, mutator and replacement);
   - the after run killed the 3 targeted mutants.

   What had to be corrected:
   - The AI first loaded `apps/web/modules/test-setup.ts` in the Vitest config. That broke all the `login-view` tests, because its `@calcom/lib/constants` mock has no `WEBAPP_URL`, so it was removed.
   - A credentials-submit test for `:162` couldn't work in this environment (see the table) and was dropped.
   - One test edit broke the file's line endings and was rebuilt from the committed version.

## Setup notes

- **Scope: only the code #146 changed that unit tests reach** (option A, chosen to save time). That is:
  - `authErrorMessages.ts` and `oidcLoginButtons.ts` in full;
  - the changed lines of `login-view.tsx`: 132-134, 162, 181-184, 244-264 and 341-343.
- **Left out on purpose:**
  - `signup-view.tsx:201,737-754`, `app/(use-page-wrapper)/auth/error/page.tsx:36`, `server/lib/auth/login/getServerSideProps.tsx:90,97` and `lib/signup/getServerSideProps.tsx:59-68` have no unit tests, so they would only add No-coverage mutants.
  - `useLastUsed.tsx` is a type-only change and produces no mutants.
  - `common.json` isn't JavaScript or TypeScript, so Stryker can't mutate it.
  - **Tradeoff:** the score measures the tests of the code that is unit-tested. It says nothing about the sign-up buttons or the server-side wiring, which are checked only by E2E and manual testing.
- **Counts:** 109 mutants in total. 36 are reported as Ignored in both runs, because `ignoreStatic` (from the shared config) skips the code-to-key `Map`s in `authErrorMessages.ts`, which are built once when the module loads.
- **The test list is explicit:** `authErrorMessages.test.ts`, `oidcLoginButtons.test.ts` and `login-view.test.tsx`. That's 45 tests before and 46 after.
- **Same mutants in both runs:** the mutated code didn't change between the runs, and both reports hold the same 109 mutants at identical locations. Only `login-view.test.tsx` changed.
- **Node 22.23.2**, so Stryker 10 runs directly; the nvm workaround wasn't needed.

| Status | Before | After |
|---|---|---|
| Killed | 67 | 70 |
| Survived | 5 | 2 |
| No coverage | 1 | 1 |
| Ignored (static) | 36 | 36 |
| Timeout | 0 | 0 |
| Errors | 0 | 0 |
| Score (total / covered) | 91.78% / 93.06% | 95.89% / 97.22% |
