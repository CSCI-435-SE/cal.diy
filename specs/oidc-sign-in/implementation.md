# OIDC Sign-In Implementation

## Status: spec draft (no product code)

## Completed

- Draft spec: `design.md` (43 acceptance criteria), `decisions.md` (ADR-001 to ADR-009), `customer-questions.md`, `breakdown.md`.
- Code reading on `origin/main` at `e01d161c0c` (facts in design.md, Technical Design).

## In Progress

- Team review of the breakdown and owners.
- Customer questions not yet posted on #131.

## Blocked

- Sub-issue 7 (account linking) waits on customer Q1 and Q8.
- Sub-issue 1 waits on a yes for the `schema.prisma` change.
- Sub-issue 9's password-login switch waits on customer Q4.

## Sprint 3 slice (demo by 2026-11-19)

Path: an admin adds one Keycloak provider in **Settings → Admin → Identity providers** (secret encrypted), the login page shows "Continue with <name>", a user with a verified email signs in against the local Keycloak and gets a new Cal.diy account, and a user with an unverified email sees the `unverified-email` message. A first login whose email matches an existing account is rejected with `oidc-account-exists`; that is the safe rule under every answer to Q1, so the slice does not wait on the customer.

Sub-issues on the path and merge order:

1. Sub-issue 1 (data model and repository). Everything else needs it.
2. Sub-issue 3 (admin service and tRPC) and sub-issue 5 (per-request providers and new-user sign-in), in parallel.
3. Sub-issue 4 (admin page, after 3) and sub-issue 6 (login buttons and errors, after 5).
4. Sub-issue 2 (Keycloak) at any time; the demo needs it.

Demo script: start Keycloak; sign in as the instance admin; add the provider; Test connection; enable; sign out; click the button; sign in as the verified Keycloak user (new account, onboarding); sign out; sign in as the unverified user (error page).

Moves to Sprint 4: sub-issues 7, 8, 9 (linking, settings page, removal with counts, password-login switch, Playwright test).

Risk: sub-issue 5 is the largest and touches the 1,255-line `next-auth-options.ts`. Start it on day one after sub-issue 1 merges. Keep the change to that file to two delegation calls (top of `signIn`, top of `jwt`) and the `getOptions` argument.

## Deep review

2026-11-09: a narrow Fable 5.1 review of the account-linking path (`signIn`, `jwt`, adapter, next-auth 4.24.13 callback order). It found one gap the first draft missed: storing `sub` in `User.identityProviderId` would let a second provider collide with a first provider's `sub` through the shared lookups. Its five rules are in ADR-005 and criteria 14, 28, 30, 31 and 34. Sub-issues 5 and 7 each get their own narrow Deep review of the code before merge.

## Next Steps

1. Team agrees on the breakdown and fills owners.
2. Zachary posts the breakdown and the questions on #131 (after the team agrees).
3. Create sub-issues 1–9 with one assignee each; add 1–6 to the Sprint 3 milestone.
4. Owner of sub-issue 1 asks for the schema yes, then writes the full sub-issue spec.
5. Each owner gets a spec-review comment before code.

## Session Notes

- 2026-11-09: Spec drafted from #131 and code reading. `login-view.tsx` does not read `?error=` from the URL, so next-auth's `OAuthSignin` / `OAuthCallback` redirects show nothing today; criterion 22 and sub-issue 6 cover it. The `signIn` branch at L1012 lets any verified non-`CAL` login enter an existing non-`CAL` account by email; a naive `OIDC` enum value would fall into it (criterion 28).
