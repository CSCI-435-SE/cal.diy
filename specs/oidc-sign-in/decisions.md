# OIDC Sign-In Decisions

Status of each ADR: **Proposed** (team picks, spec review confirms), **Customer** (the customer decides; we propose), or **Owner** (Zachary or the team decides before the PR that needs it).

## ADR-001: How providers reach NextAuth without a restart

Status: Proposed.

### Context

Today `providers` is a module-level array built once at import (`next-auth-options.ts:307–370`), and `getOptions` is synchronous. Criterion 1 requires a change to take effect on the next login with no restart. `apps/web/pages/api/auth/[...nextauth].ts` already calls `NextAuth(req, res, getOptions(...))` on every request, so options can differ per request.

### Options Considered

1. **Load enabled providers from the database on each `/api/auth/*` request.** The handler awaits a repository call, then passes the result to `getOptions`. Pros: always current, no invalidation logic, correct on several server instances. Cons: one indexed query per auth request (sign-in, callback, session, CSRF). Auth traffic is small next to booking traffic, and the table holds at most 10 rows.
2. **Cache providers in memory with invalidation on admin save.** Pros: no query on most requests. Cons: each server instance has its own cache, so a save on instance A is stale on instance B until a TTL expires; this breaks criterion 1 on any multi-instance deploy unless we add Redis pub/sub. More code to review.
3. **Build providers at boot from the database.** Pros: no change to `getOptions`. Cons: needs a restart, which fails criterion 1.

### Decision

Option 1. `getOptions` gains a `dynamicProviders: Provider[]` argument and stays synchronous, so its other callers do not change. Only the NextAuth route handler awaits the load. If a profile shows the query matters, add option 2 behind the same repository method later (recorded in `future-work.md`).

### Consequences

- Every caller of `getOptions` must be checked. Callers that do not handle sign-in (for example session decoding) pass an empty list.
- A database outage also breaks OIDC sign-in. Password login already needs the database, so this adds no new failure mode.

## ADR-002: How a user's OIDC link is stored

Status: Proposed. Needs a yes before any edit to `schema.prisma`.

### Context

`User.identityProvider` is one enum (`CAL | GOOGLE | SAML | AZUREAD`) and `User.identityProviderId` is one string. Admins create providers at run time, and two providers can issue the same `sub`. `getIdentityProvider` returns `null` for unknown ids, which sends `signIn` to `unknown-provider` and `jwt` to the email-based auto-merge.

### Options Considered

1. **One `OIDC` enum value; the link is an `Account` row with `provider = "oidc-<id>"`, `providerAccountId = sub`.** Pros: `Account` already has `@@unique([provider, providerAccountId])`, so one `sub` per provider maps to one user; a user can hold links to several providers; no `User` column change. Cons: OIDC lookups must use `Account`, not `User.identityProviderId`, so the OIDC path cannot share the existing lookup at L891.
2. **One `OIDC` enum value plus a new `User.identityProviderConfigId` column.** Pros: keeps the existing `identityProvider + identityProviderId` lookup. Cons: one link per user only, so linking a second provider overwrites the first; a second migration on the largest table.
3. **One enum value per provider.** Cons: enums are fixed at migration time, so an admin cannot add one at run time. Rejected outright.

### Decision

Option 1. New OIDC users get `identityProvider = OIDC` and `identityProviderId = null`. Storing `sub` there would be unsafe: the shared lookups at L891, L914 and L601 match on `identityProvider + identityProviderId` with no provider id, so provider B asserting the `sub` a user has at provider A would match that user (found by the Deep review). Existing users who link a provider keep their `identityProvider`, so their password or Google login keeps working.

### Consequences

- `getIdentityProvider` maps the `oidc-` prefix to `OIDC`.
- Removing a provider means deleting its `Account` rows (criterion 37).
- `requiresTwoFactorSetup` treats `OIDC` as non-`CAL`, so OIDC users are exempt from site-wide 2FA unless the customer says otherwise (Q6).

## ADR-003: Provider id in URLs and `Account.provider`

Status: Proposed.

### Options Considered

1. **Immutable database id (`oidc-<cuid>`).** Pros: renaming the display name never breaks links or the registered callback URL. Cons: the callback URL is not human-readable.
2. **Admin-chosen slug (`oidc-university`).** Pros: readable URL. Cons: editing the slug breaks every link and the URL registered at the provider, so the slug would have to be locked after creation, which is option 1 with extra rules.

### Decision

Option 1.

## ADR-004: What happens when an OIDC email matches an existing account

Status: **Customer** (Q1). We propose; we do not pick. This path gets a narrow Deep (Fable 5.1) review before implementation.

### Context

Any provider an admin adds can assert any email, including the email of the instance admin. Google and Microsoft use `allowDangerousEmailAccountLinking: true` and the `signIn` branches at L1012 and L1051 merge on a verified email. If OIDC used the same paths, a misconfigured or hostile provider, or a user who can set their own email at a self-service provider, could take over any account. The `jwt` callback's `autoMergeIdentities()` (L453) also finds the user by `token.email`, so a wrong `true` from `signIn` becomes a session for the email's owner.

### Options Considered

1. **Auto-link on verified email.** Pros: no friction; matches Google and Microsoft today. Cons: account takeover whenever a provider asserts an email it does not own. Self-service providers (Keycloak with user registration on, or a provider that lets users edit their email) make this easy.
2. **Reject and require linking from settings.** The user signs in with their existing method, then clicks "Link" in Settings → Security, which proves control of both accounts. Pros: no takeover path; simple to test. Cons: one extra step for every existing user at roll-out.
3. **Auto-link only for allowed domains.** Each provider has a list of email domains the admin says the provider owns. A verified email in that list auto-links; any other match is rejected as in option 2. Accounts with role `ADMIN` never auto-link. Pros: smooth roll-out for the organization's own domain; takeover risk limited to domains the admin vouched for. Cons: more rules to test; a wrong list is still a takeover path for that domain.

### Proposal to the customer

Option 3 with option 2 as the fallback, and no auto-link for `ADMIN` accounts. Sprint 3 ships option 2 only (reject), because it is safe under every answer and the Sprint 3 demo needs only new accounts.

### Consequences

- The OIDC branch must never fall through to L1012, L1021, L1051 or `autoMergeIdentities()`. A test per branch (criterion 28).
- Linking from settings (sub-issue 6) is needed for existing users under options 2 and 3.

## ADR-005: Where the OIDC logic sits in `signIn` and `jwt`

Status: Proposed.

### Options Considered

1. **A separate OIDC branch at the top of `signIn`, in its own service (`OidcSignInService`), returning before the shared code.** Pros: the shared Google/Azure/SAML branches stay untouched (Google and Microsoft are out of scope); the OIDC rules are testable without the 400-line callback; follows the factory rule (conditionals at the entry point). Cons: some duplication of user-creation code.
2. **Add `OIDC` cases to the existing branches.** Pros: less new code. Cons: every existing branch gains an OIDC condition; a missed condition is a takeover (ADR-004); review must re-read all of `signIn`.

### Decision

Option 1. `signIn` checks `account.provider.startsWith("oidc-")` once and delegates. The `jwt` callback does the same and takes the user id from the `user` that next-auth resolved through the `Account` row.

### Rules from the Deep review (2026-11-09)

A narrow Fable 5.1 review of the `signIn`, `jwt` and adapter paths found these rules necessary. Each needs a test in sub-issue 5 or 7.

1. For `oidc-*` the only identity lookup is `Account(provider, providerAccountId)`. Never query `identityProviderId` for OIDC (cross-provider `sub` collision).
2. Never add OIDC to the adapter's legacy `identityProviderId` fallback (`next-auth-custom-adapter.ts:90–104`).
3. `signIn` knows the session user (via a `getSessionUserId` getter in `getOptions`), so a settings link to the user's own email is not rejected by the Sprint 3 rule, and a link to another user's email is.
4. Create the user and the `Account` row in one transaction. Otherwise a failed `linkAccount` leaves a user who owns the email, and next-auth's email check then blocks that person.
5. The link flow uses `prompt=login` and shows the provider's email before confirming (lower risk; prevents attaching an identity from a stale provider session).

## ADR-006: How the client secret is stored

Status: Proposed.

### Options Considered

1. **Encrypt with `symmetricEncrypt` and `CALENDSO_ENCRYPTION_KEY` in the provider row.** Pros: existing precedent (`packages/lib/crypto.ts`); no new dependency; works with criterion 1. Cons: anyone with the database and the key can read secrets; AES-256-CBC without authentication (same as existing credentials).
2. **Store the name of an environment variable that holds the secret.** Pros: secret never in the database. Cons: needs an environment change and restart for each new provider, which fails criterion 1.
3. **Store plain text.** Cons: a database dump leaks every secret. Rejected.

(Hashing is not possible: the server must send the secret to the provider.)

### Decision

Option 1. The secret is write-only in the UI and absent from every DTO.

## ADR-007: User data from the ID token or the userinfo endpoint

Status: Proposed.

### Options Considered

1. **ID token claims (`idToken: true`).** Pros: signed by the provider and checked against its JWKS; one fewer request. Cons: some providers put `email` only in userinfo unless configured.
2. **Userinfo endpoint.** Pros: always has the profile claims. Cons: extra request that can fail; data not signed.

### Decision

Option 1. If the ID token has no `email`, the login fails with `missing-email` (criterion 16), and the admin docs say how to release the claim in Keycloak, Authentik and Okta.

## ADR-008: Test identity provider

Status: **Owner** (where the compose service lives).

### Options Considered

1. **Keycloak in a separate compose file under `specs/oidc-sign-in/test-idp/` (or `docker/`), with a realm export.** Pros: real provider; teammates who do not work on OIDC run nothing new; no change to the shared `docker-compose.yml`. Cons: one more command to start.
2. **Add Keycloak to `docker-compose.yml`.** Pros: one command. Cons: every teammate pulls and runs a ~500 MB image; changes a shared file.
3. **A small mock OIDC server (for example `oidc-provider` in Node) for unit and CI tests.** Pros: fast, scriptable claims. Cons: not a real provider; a new dev dependency (needs a yes).

### Proposal

Option 1 for manual and end-to-end tests; unit tests mock the provider response and need no server. Option 3 only if CI needs it later.

## ADR-009: Removing a provider that users depend on

Status: Proposed.

### Options Considered

1. **Allow delete with a typed confirmation that shows linked and only-login user counts; delete the `Account` rows; users recover by password reset.** Pros: admin stays in control; nobody loses data. Cons: some users must reset a password.
2. **Block delete while any user is linked; offer disable only.** Pros: no one loses a login. Cons: an admin who changed providers can never clean up.
3. **Delete with no warning.** Cons: silent lock-out. Rejected.

### Decision

Option 1, plus disable (criterion 38) as the reversible choice the page offers first.
