# #131 sub-issue breakdown (draft)

Checked on GitHub on 2026-11-19. Four rows have a sub-issue (#136, #151, #152, #146); rows 4, 5 and 7 to 10 have none. Owners are the GitHub assignees. The "Comment for #131" section is not posted yet; it is ready to paste as a comment on #131 (a copy is in `passoff/draft-131-breakdown-comment.md` in the main checkout). Each owner writes the full spec in their sub-issue before code, and a teammate posts a spec review.

Full spec: `specs/oidc-sign-in/design.md` (criteria numbers below refer to it). Decisions: `decisions.md`.

## Rules for every sub-issue

- One GitHub assignee, who writes or refines the sub-issue spec before code. The spec states its scope (small or medium) and one or two sentences on why.
- Link each sub-issue to #131 and attach it to the Sprint 3 milestone. Sub-issues count toward each member's two-medium-issue minimum.
- A spec-review comment from another teammate before implementation. It must say what was checked: each acceptance criterion clear and testable, which cases were considered, whether the scope fits. "Looks good" alone does not count.
- One PR under 500 changed lines and under 10 code files. The description has `Closes #<sub-issue>`, the Tech Debt section and the Test Evidence table (one row per criterion; expected values come from the criterion, never from the code's output).
- Merge only after a teammate approves the latest commit. After that approval the author may merge. Request the review on GitHub and tell the reviewer on Zulip; reviewers answer within 24 hours.
- Sprint 3 replaces UML diagrams with mutation testing (StrykerJS with the Vitest runner) on one of each member's issues. Rows 1, 3 and 5 have the most unit-testable logic for this.
- Zach Bowden cannot run the Next.js dev server. Rows 1, 3 and 5 can be verified with unit tests alone; rows 4, 6 and 8 need a browser.

## Comment for #131

---

**Breakdown of #131 into sub-issues**

Full draft spec (acceptance criteria, edge cases, decisions with alternatives): `specs/oidc-sign-in/` in draft PR #133 (branch `docs/oidc-spec`). Your answers of 2026-11-12 to our 13 questions are recorded in `staff-questions.md` and in the criteria. Q4 (password-login switch) and Q6 (accept the provider's MFA) are Sprint 4 work.

| # | Sub-issue | Area in #131 | Size | Depends on | Sprint | Owner | Issue | Status on 2026-11-19 |
|---|---|---|---|---|---|---|---|---|
| 1 | OIDC provider data model and repository | Provider configuration | M | none | 3 | `zach-short` | #136 | Spec posted; Sprint 3 milestone; no spec review yet; no PR. |
| 2 | Local Keycloak test provider and realm | Test setup | S | none | 3 | none yet | #151 | Spec posted; no assignee; no milestone; no spec review yet; no PR. |
| 3 | Admin provider service and tRPC procedures | Provider configuration | M | 1 | 3 | `julissaehp` | #152 | Spec posted; no milestone; no spec review yet; no PR. |
| 4 | Admin "Identity providers" settings page | Provider configuration | M | 3 | 3 | none yet | none yet | Not started. |
| 5 | Load providers per request and create new OIDC users | Login and sign-up | M | 1 | 3 | none yet | none yet | Not started. |
| 6 | Login page buttons and sign-in error messages | Login and sign-up | M | 5 | 3 | `dchan01-wm` | #146 | Spec posted; Sprint 3 milestone; spec review posted (`julissaehp`, 2026-11-19); no PR. |
| 7 | Link OIDC to existing accounts and accept invites (Q1, Q2, Q8) | Account creation and linking | M | 5 | 4 | none yet | none yet | Not started. |
| 8 | Connected logins in Settings → Security (link, unlink) | User account settings | M | 7 | 4 | none yet | none yet | Not started. |
| 9 | Provider removal, forgot-password proof, password-login switch, end-to-end tests (Q4, Q5) | Provider configuration, test setup | M | 4, 7 | 4 | none yet | none yet | Not started. |
| 10 | Accept the provider's MFA (Q6) | Login and sign-up | M | 5 | 4 | none yet | none yet | Not started. |

**Sprint 3 demo (Nov 19):** the end-to-end slice is not finished. No OIDC code PR is open or merged on 2026-11-19. What exists: the feature spec with your answers recorded (draft PR #133), and full sub-issue specs for rows 1, 2, 3 and 6 (#136, #151, #152, #146), of which #146 has a spec review. Rows 4 and 5 have no sub-issue yet, and row 5 (the login flow) is the piece that connects the UI to the server. The slice we planned is unchanged: an admin adds a Keycloak provider in admin settings (secret stored encrypted), the login page shows "Continue with <name>", a user with a verified email signs in and gets a new account, and a user with an unverified email sees a clear error. A login whose email matches an existing account is rejected in that slice; auto-linking under your Q1 rule follows in Sprint 4. Merge order: 1 first; then 3 and 5 in parallel; then 4 (after 3) and 6 (after 5). Row 2 can merge at any time.

---

## Sub-issue seeds

Each seed is the starting spec. The owner expands it into a full issue (story, scenario, numbered criteria, out of scope, design decisions with two alternatives) like #130. Where a sub-issue exists on GitHub, the issue is the source of truth and the seed is history.

### 1. OIDC provider data model and repository (M, Sprint 3) (#136, `zach-short`)

Add `OIDC` to `enum IdentityProvider` and a new `OidcProvider` model (fields in design.md, Database Changes) with a migration. Add `PrismaOidcProviderRepository` (#136 names: `findEnabled`, `list`, `findByIdWithEncryptedSecret`, `create`, `update`, `setEnabled`, `countLinkedAccounts`, `deleteWithAccounts`) using `select`, never `include`, and wire it with the moduleLoader DI pattern. The secret column stores only ciphertext. Criteria 3 (shape), 9, 39, 40. Unit tests for the repository with a mocked Prisma client. **Needs a yes before editing `schema.prisma`** (project rule). ~250 lines. Verifiable without the dev server. Follow-up from the course staff answers: #136 has no `ownedDomains` or `acceptProviderMfa` column (design criterion 3a, ADR-010, ADR-011). The #136 owner decides whether to add them now or leave them to a Sprint 4 migration.

### 2. Local Keycloak test provider and realm (S, Sprint 3) (#151, no assignee)

Add a compose file and a realm export with one client (`cal-diy`, confidential, redirect URI `http://localhost:3000/api/auth/callback/*`) and three users: verified email, unverified email, no email claim. Add a README with exact start and stop commands and the values to paste into the admin page. Where the compose service lives is an owner's call (ADR-008); #151 proposes `specs/oidc-sign-in/test-idp/`. The course staff asked that the README let anyone on the team run the tests (Q12). Criterion 42. ~150 lines, mostly JSON. #151 has no assignee and no milestone.

### 3. Admin provider service and tRPC procedures (M, Sprint 3) (#152, `julissaehp`)

Add `OidcProviderService`: field validation (criteria 3, 4), secret encryption with `symmetricEncrypt` and a clear error when `CALENDSO_ENCRYPTION_KEY` is bad (6, 10), and `testDiscovery` with a 5-second timeout that returns one of the results in criterion 5. Add `viewer.admin.oidcProviders.{list,create,update,setEnabled,delete,testDiscovery}` on `authedAdminProcedure`; `list` returns a DTO with no secret field (2, 6). Enabling requires a passing discovery test. Unit tests cover each validation error, each discovery result and the non-admin `FORBIDDEN` path. ~400 lines with tests. Verifiable without the dev server. #152 estimates 550 to 700 lines and plans two PRs; it has no milestone.

### 4. Admin "Identity providers" settings page (M, Sprint 3) (no issue yet)

Add `settings/(admin-layout)/admin/identity-providers/page.tsx` with the `ADMIN` role check in the page, and a view in `apps/web/modules/settings/admin/`. List providers; add and edit form with inline errors; write-only secret field ("Secret is set" / "Replace secret"); callback URL with copy button; Test connection button with its result; enable and disable switch; reorder. Every string in `common.json`. Criteria 1–9. Delete with typed confirmation moves to row 9. ~400 lines. Needs a browser.

### 5. Load providers per request and create new OIDC users (M, Sprint 3) (no issue yet)

Make the NextAuth route handler async: load enabled providers through the repository and pass them to `getOptions` as `dynamicProviders` (ADR-001). Build each as a next-auth `oauth` provider with `wellKnown`, `idToken: true`, PKCE and state, a 5-second HTTP timeout, and no dangerous email linking. Map the `oidc-` prefix to `IdentityProvider.OIDC`. Add `OidcSignInService`, called from the top of `signIn` and `jwt` (ADR-005): reject unverified (15), missing email (16), name fallback (17), sign-up rules (18), site-wide "disable signup" wins over the provider switch (18a), create the user and `Account` row (14), find returning users by (provider, `sub`) (19), keep TOTP (20), and reject any email match with `oidc-account-exists` (27, Sprint 3 rule). Create the user and `Account` row in one transaction; leave `identityProviderId` null. A test per branch, including criterion 28 (no path reaches the shared lookups or auto-merge code) and a two-providers-one-`sub` test (criterion 30). Rules 1–4 from the Deep review in ADR-005 apply. ~450 lines with tests. **Gets a narrow Deep review of the `signIn` and `jwt` changes before merge.** Verifiable with unit tests; the demo needs row 2.

### 6. Login page buttons and sign-in error messages (M, Sprint 3) (#146, `dchan01-wm`)

First seeded as small; #146 sizes it as medium (7 to 9 files, 200 to 300 lines). Pass enabled providers (id and display name only) from the login and sign-up `getServerSideProps`. Render one "Continue with <name>" button per provider after Microsoft, with `useLastUsed` (11, 12). The sign-up page shows none when sign-up is disabled site-wide (12, 18a). Read `error` from the URL on the login page and show messages for `OAuthSignin`, `OAuthCallback` and `AccessDenied` (21–25). Add the new error codes to `/auth/error` (`missing-email`, `oidc-signup-not-allowed`, `oidc-account-exists`, `unknown-provider`). ~200 lines. Needs a browser.

### 7. Link OIDC to existing accounts and accept invites (M, Sprint 4) (no issue yet)

Implement the course staff's answers to Q1, Q7 and Q8 (2026-11-12) inside `OidcSignInService`: auto-link only for a verified email on a domain the provider owns, never for `ADMIN` accounts, otherwise reject (27, 27a, ADR-004, ADR-011); a verified login with an invited email accepts the invite, even when "allow new accounts" is off or sign-up is disabled site-wide (29, 18a); two providers with one email (30); email change at the provider, where a taken email keeps the old one and the user sees a notice (31). Needs the `ownedDomains` column (criterion 3a). Calls `linkAccount` inside `signIn` so that next-auth finds the account by (provider, `sub`). **Gets a narrow Deep review.** Criteria 27–32. ~300 lines with tests.

### 8. Connected logins in Settings → Security (M, Sprint 4) (no issue yet)

List linked providers with link dates (33). "Link" starts the flow for the signed-in user with `prompt=login` and adds an `Account` row to that user, with a clear error if the `sub` is linked elsewhere (34). Needs the `getSessionUserId` getter in `getOptions` (ADR-005, rule 3). "Unlink" is disabled when it is the last login method and explains the set-password flow (35). ~350 lines. Needs a browser.

### 9. Provider removal, forgot-password proof, password-login switch, end-to-end tests (M, Sprint 4) (no issue yet)

Delete with typed confirmation and linked-user counts (36, 37), with "Disable instead" offered first (36a); disable keeps links (38). A test that "Forgot password" works for a user created through OIDC with no password, before and after the provider is removed (37a, course staff Q5). The password-login switch with the admin break-glass rule (41, course staff Q4). Playwright test against the Keycloak realm for criteria 14 and 15 (43). Split into two PRs: removal and the forgot-password test; then the switch and the Playwright test. ~400 lines.

### 10. Accept the provider's MFA (M, Sprint 4) (no issue yet)

Added after course staff Q6 (2026-11-12). A per-provider setting "accept this provider's MFA" (default off) on the admin form (44). Parse the ID token's `amr` claim with the ADR-010 rule; with the setting on and a second factor shown, skip the Cal.diy TOTP step and the site-wide required-setup step (45); otherwise apply Cal.diy 2FA as for a password user, which changes the non-`CAL` exemption in `requiresTwoFactorSetup` (46). Unit tests for each `amr` case (47); the `amr` parser suits mutation testing. Needs the `acceptProviderMfa` column (criterion 3a) and a Keycloak user with OTP. ~250 lines with tests.

## Load notes for the team

- Zachary also owns #130 this sprint.
- Sprint 2 carryovers are in `docs/sprint3/carryovers.md`; owners of those may want a smaller row.
- Rows 1, 3, 5 suit someone who prefers backend and unit tests. Rows 4, 6 need someone who runs the dev server. Row 2 needs Docker.
- On 2026-11-19: #151 needs an assignee; #151 and #152 need the Sprint 3 milestone (or a Sprint 4 milestone if they move); #136, #151 and #152 need a spec-review comment; rows 4 and 5 need a sub-issue and an owner. Row 5 is the largest and connects the UI to the server.
