# #131 sub-issue breakdown (draft)

Draft for the team. After the team fills the Owner column, paste the "Comment for #131" section as a comment on #131. Then create one sub-issue per row; each owner writes the full spec in their sub-issue before code, and a teammate posts a spec review.

Full spec: `specs/oidc-sign-in/design.md` (criteria numbers below refer to it). Decisions: `decisions.md`.

## Rules for every sub-issue

- One GitHub assignee, who writes or refines the sub-issue spec before code.
- A spec-review comment from another teammate before implementation.
- One PR under 500 changed lines and under 10 code files; drafts first; reviewer merges.
- Each implemented sub-issue gets a class and a sequence diagram in `docs/sprint3/diagrams/` (or `sprint4`).
- Zach Bowden cannot run the Next.js dev server. Rows 1, 3 and 5 can be verified with unit tests alone; rows 4, 6 and 8 need a browser.

## Comment for #131

---

**Breakdown of #131 into sub-issues**

Full draft spec (acceptance criteria, edge cases, proposed answers, decisions with alternatives): `specs/oidc-sign-in/` on branch `docs/oidc-spec`. Our questions for you are in the next comment.

| # | Sub-issue | Area in #131 | Size | Depends on | Sprint | Owner |
|---|---|---|---|---|---|---|
| 1 | OIDC provider data model and repository | Provider configuration | M | — | 3 | |
| 2 | Local Keycloak test provider and realm | Test setup | S | — | 3 | |
| 3 | Admin provider service and tRPC procedures | Provider configuration | M | 1 | 3 | |
| 4 | Admin "Identity providers" settings page | Provider configuration | M | 3 | 3 | |
| 5 | Load providers per request and create new OIDC users | Login and sign-up | M | 1 | 3 | |
| 6 | Login page buttons and sign-in error messages | Login and sign-up | S | 5 | 3 | |
| 7 | Link OIDC to existing accounts (rule from customer) | Account creation and linking | M | 5, customer Q1 | 4 | |
| 8 | Connected logins in Settings → Security (link, unlink) | User account settings | M | 7 | 4 | |
| 9 | Provider removal, password-login switch, end-to-end tests | Provider configuration, test setup | M | 4, 7 | 4 | |

**Sprint 3 demo (by Nov 19):** an admin adds a Keycloak provider in admin settings (secret stored encrypted), the login page shows "Continue with <name>", a user with a verified email signs in and gets a new account, and a user with an unverified email sees a clear error. A login whose email matches an existing account is rejected for now, which is safe under every answer to our linking question. Merge order: 1 first; then 3 and 5 in parallel; then 4 (after 3) and 6 (after 5). Row 2 can merge at any time.

---

## Sub-issue seeds

Each seed is the starting spec. The owner expands it into a full issue (story, scenario, numbered criteria, out of scope, design decisions with two alternatives) like #130.

### 1. OIDC provider data model and repository (M, Sprint 3)

Add `OIDC` to `enum IdentityProvider` and a new `OidcProvider` model (fields in design.md, Database Changes) with a migration. Add `PrismaOidcProviderRepository` (`findEnabled`, `findById`, `list`, `create`, `update`, `delete`, `countLinkedUsers`) using `select`, never `include`, and wire it with the moduleLoader DI pattern. The secret column stores only ciphertext. Criteria 3 (shape), 9, 39, 40. Unit tests for the repository with a mocked Prisma client. **Needs a yes before editing `schema.prisma`** (project rule). ~250 lines. Verifiable without the dev server.

### 2. Local Keycloak test provider and realm (S, Sprint 3)

Add a compose file and a realm export with one client (`cal-diy`, confidential, redirect URI `http://localhost:3000/api/auth/callback/*`) and three users: verified email, unverified email, no email claim. Add a README with exact start and stop commands and the values to paste into the admin page. Where the compose service lives is an owner's call (ADR-008). Criterion 42. ~150 lines, mostly JSON.

### 3. Admin provider service and tRPC procedures (M, Sprint 3)

Add `OidcProviderService`: field validation (criteria 3, 4), secret encryption with `symmetricEncrypt` and a clear error when `CALENDSO_ENCRYPTION_KEY` is bad (6, 10), and `testDiscovery` with a 5-second timeout that returns one of the results in criterion 5. Add `viewer.admin.oidcProviders.{list,create,update,setEnabled,delete,testDiscovery}` on `authedAdminProcedure`; `list` returns a DTO with no secret field (2, 6). Enabling requires a passing discovery test. Unit tests cover each validation error, each discovery result and the non-admin `FORBIDDEN` path. ~400 lines with tests. Verifiable without the dev server.

### 4. Admin "Identity providers" settings page (M, Sprint 3)

Add `settings/(admin-layout)/admin/identity-providers/page.tsx` with the `ADMIN` role check in the page, and a view in `apps/web/modules/settings/admin/`. List providers; add and edit form with inline errors; write-only secret field ("Secret is set" / "Replace secret"); callback URL with copy button; Test connection button with its result; enable and disable switch; reorder. Every string in `common.json`. Criteria 1–9. Delete with typed confirmation moves to row 9. ~400 lines. Needs a browser.

### 5. Load providers per request and create new OIDC users (M, Sprint 3)

Make the NextAuth route handler async: load enabled providers through the repository and pass them to `getOptions` as `dynamicProviders` (ADR-001). Build each as a next-auth `oauth` provider with `wellKnown`, `idToken: true`, PKCE and state, a 5-second HTTP timeout, and no dangerous email linking. Map the `oidc-` prefix to `IdentityProvider.OIDC`. Add `OidcSignInService`, called from the top of `signIn` and `jwt` (ADR-005): reject unverified (15), missing email (16), name fallback (17), sign-up rules (18), create the user and `Account` row (14), find returning users by (provider, `sub`) (19), keep TOTP (20), and reject any email match with `oidc-account-exists` (27, Sprint 3 rule). Create the user and `Account` row in one transaction; leave `identityProviderId` null. A test per branch, including criterion 28 (no path reaches the shared lookups or auto-merge code) and a two-providers-one-`sub` test (criterion 30). Rules 1–4 from the Deep review in ADR-005 apply. ~450 lines with tests. **Gets a narrow Deep review of the `signIn` and `jwt` changes before merge.** Verifiable with unit tests; the demo needs row 2.

### 6. Login page buttons and sign-in error messages (S, Sprint 3)

Pass enabled providers (id and display name only) from the login and sign-up `getServerSideProps`. Render one "Continue with <name>" button per provider after Microsoft, with `useLastUsed` (11, 12). Read `error` from the URL on the login page and show messages for `OAuthSignin`, `OAuthCallback` and `AccessDenied` (21–25). Add the new error codes to `/auth/error` (`missing-email`, `oidc-signup-not-allowed`, `oidc-account-exists`, `unknown-provider`). ~200 lines. Needs a browser.

### 7. Link OIDC to existing accounts (M, Sprint 4)

Implement the customer's answer to Q1 and Q8 inside `OidcSignInService`: domain-based auto-link or reject, never for `ADMIN` accounts, invited-user rule, two providers with one email (30), email change at the provider (31). Calls `linkAccount` inside `signIn` so that next-auth finds the account by (provider, `sub`). **Gets a narrow Deep review.** Criteria 27–32. ~300 lines with tests.

### 8. Connected logins in Settings → Security (M, Sprint 4)

List linked providers with link dates (33). "Link" starts the flow for the signed-in user with `prompt=login` and adds an `Account` row to that user, with a clear error if the `sub` is linked elsewhere (34). Needs the `getSessionUserId` getter in `getOptions` (ADR-005, rule 3). "Unlink" is disabled when it is the last login method and explains the set-password flow (35). ~350 lines. Needs a browser.

### 9. Provider removal, password-login switch, end-to-end tests (M, Sprint 4)

Delete with typed confirmation and linked-user counts (36, 37), disable keeps links (38). If the customer wants it (Q4), the password-login switch with the admin break-glass rule (41). Playwright test against the Keycloak realm for criteria 14 and 15 (43). May split into two PRs if the switch is in scope. ~400 lines.

## Load notes for the team

- Zachary also owns #130 this sprint.
- Sprint 2 carryovers are in `docs/sprint3/carryovers.md`; owners of those may want a smaller row.
- Rows 1, 3, 5 suit someone who prefers backend and unit tests. Rows 4, 6 need someone who runs the dev server. Row 2 needs Docker.
