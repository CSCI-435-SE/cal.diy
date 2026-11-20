# OIDC Sign-In Design

Issue: #131. Sprints 3 and 4. Status: **draft; course staff answers recorded** (all 13 questions answered on #131 on 2026-11-12, see `staff-questions.md`).

Line numbers refer to `origin/main` at `e01d161c0c`.

## Overview

An instance admin connects Cal.diy to one or more OpenID Connect (OIDC) identity providers (Keycloak, Authentik, Okta, and others) from the admin settings page. Users then see "Continue with <provider>" on the login page and sign in with their organization account. Providers are stored in the database, so adding, editing or removing one needs no environment variable and no restart.

## Problem Statement

Self-hosted Cal.diy supports only email and password, Google and Microsoft login. Google and Microsoft are configured with environment variables at boot. Organizations that host Cal.diy already have their own identity provider, so their staff keep a second password for Cal.diy, and leaving the organization does not end Cal.diy access.

## User Stories

- As an instance admin, I want to connect our identity provider from the admin settings page, so that our staff log in with the account they already have.
- As a staff member, I want to click "Continue with University SSO" and come back logged in, so that I do not need a separate Cal.diy password.
- As an existing Cal.diy user, I want to link my organization login to my existing account, so that I keep my event types and bookings.
- As an instance admin, I want a broken or removed provider to fail safely, so that no one gets into an account that is not theirs and no one is locked out without a way back.

## User Scenario

An IT admin opens **Settings → Admin → Identity providers**, clicks **Add provider**, and enters the display name "University SSO", the issuer URL, the client ID and the client secret. The page shows the callback URL to register at the provider. The admin clicks **Test connection**; Cal.diy fetches the discovery document and shows "Connection OK". The admin saves and enables the provider.

A professor opens the login page and clicks **Continue with University SSO**. The university login page opens. After sign-in, the professor returns to Cal.diy. The professor has no Cal.diy account yet, the provider says the email is verified, and new accounts are allowed for that provider, so Cal.diy creates the account and opens onboarding.

A student whose email is not verified at the university tries the same button. Cal.diy rejects the login and shows "Your sign-in provider has not verified your email address. Verify it with your provider and try again."

## Acceptance Criteria

"Provider" below means an OIDC provider that an admin configured in Cal.diy. "Linked" means a Cal.diy user has an `Account` row for that provider's subject (`sub`).

Criteria keep their numbers, because sub-issues on GitHub cite them (for example #136 cites 6, 11, 36, 37 and 39). Criteria added after the course staff answers of 2026-11-12 have a letter suffix (for example 18a) or a number after 43.

### Provider configuration (admin)

1. An admin can add, edit, enable, disable and remove a provider at **Settings → Admin → Identity providers**. Each change takes effect on the next login request, with no environment change and no restart.
2. The page is visible only to users with role `ADMIN`. The role check is in `page.tsx`. Every tRPC procedure behind it uses `authedAdminProcedure`. A non-admin who calls a procedure directly gets `FORBIDDEN` and no data.
3. A provider has: display name (1–50 characters), issuer URL, client ID, client secret, scopes (default `openid email profile`), "allow new accounts" (default off), "allowed email domains" (optional list), and enabled (default off). Each field is validated, and an invalid field shows a message next to it. Save is blocked until every field is valid.

   3a. Sprint 4 adds two fields to a provider (course staff Q1 and Q6): "domains this provider owns" (optional list, used only for auto-linking in criterion 27a, and separate from "allowed email domains", see ADR-011) and "accept this provider's MFA" (default off, criteria 44 to 47). Both need columns that #136 (sub-issue 1) does not have. They are a follow-up for #136, or a Sprint 4 migration in the sub-issue that first needs them.
4. The issuer URL must be `https`. `http` is accepted only for `localhost`, `127.0.0.1` or a `*.localhost` host, so that a local test provider works. Scopes must include `openid`.
5. **Test connection** fetches `<issuer>/.well-known/openid-configuration` from the server with a 5-second timeout. It reports one of: OK; unreachable (network error or timeout); not a discovery document (bad JSON or missing `authorization_endpoint`, `token_endpoint` or `jwks_uri`); issuer mismatch (the document's `issuer` is not the configured issuer); `authorization_code` grant or `code` response type not supported. Saving does not require a passing test, but enabling a provider does.
6. The client secret is encrypted at rest with `symmetricEncrypt` and `CALENDSO_ENCRYPTION_KEY`. No API response, log line, page source or error message contains the secret, encrypted or plain. The edit form shows "Secret is set" and a "Replace secret" field; leaving it empty keeps the stored secret.
7. The page shows the callback URL (`<WEBAPP_URL>/api/auth/callback/<provider id>`) with a copy button, before and after the first save.
8. Two admins who edit the same provider at the same time: the later save wins, and the page shows the saved values after reload. (No merge.)
9. At most 10 providers can exist. Adding an eleventh shows a message and saves nothing.
10. If `CALENDSO_ENCRYPTION_KEY` is missing or not 32 bytes, the page shows an error that names the variable, and add or edit of a secret is blocked. Existing password, Google and Microsoft login keep working.

### Login and sign-up

11. The login page shows one "Continue with <display name>" button for each enabled provider, in the order the admin set, below the Google and Microsoft buttons. The button text uses the translated template `continue_with_provider`; only the display name comes from the admin. With no enabled provider, the login page looks exactly as it does today.
12. The sign-up page shows the same buttons only for providers with "allow new accounts" on, and none when sign-up is disabled site-wide (criterion 18a).
13. Clicking a button starts an authorization code flow with PKCE and `state` checks. User data comes from the ID token claims (`idToken: true`).
14. A first login with a verified email, no existing Cal.diy user with that email, "allow new accounts" on, and the email domain on the allowed list (or no list): Cal.diy creates a user with `identityProvider = OIDC`, `identityProviderId = null`, `emailVerified` set, the name from the `name` claim, and an `Account` row for (provider id, `sub`). The user and the `Account` row are created in one transaction, so a failed link leaves no orphan user that owns the email. The user lands in onboarding.
15. A login where `email_verified` is missing or `false` is rejected with `/auth/error?error=unverified-email` and the existing message `unverified_email_oauth_error`. No user and no `Account` row is created or changed.
16. A login with no `email` claim is rejected with a new error `missing-email` and a message that tells the user to ask their admin to release the email claim. Nothing is created.
17. A login with no `name` claim does not fail. The name falls back to `preferred_username`, then to the part of the email before `@`. (Today `signIn` returns `false` for a missing name, at `next-auth-options.ts:847`.)
18. A first login when "allow new accounts" is off, or the email domain is not on the allowed list, is rejected with a new error `oidc-signup-not-allowed`. The message says the account does not exist and names no reason that would reveal the domain list. An invited email is the exception (criterion 29).

   18a. When sign-up is disabled site-wide (`NEXT_PUBLIC_DISABLE_SIGNUP="true"` or the `disable-signup` feature flag), a first login that would create a new user is rejected with `oidc-signup-not-allowed`, even when the provider's "allow new accounts" is on. The site-wide setting wins over the provider switch (course staff Q2). A verified login whose email belongs to an invited user still accepts the invite (criterion 29). A returning linked user is not affected.

19. A returning linked user signs in as the user that owns the `Account` row, found by (provider id, `sub`), never by email. This holds after the user's email changes at the provider.
20. A linked user with Cal.diy 2FA enabled still gets the TOTP step (`loginWithTotp`), as Google users do today. In Sprint 4, criterion 45 is the one exception.
21. A user who sends a forged or expired `state`, or replays a callback, gets the login page with a "sign-in failed, try again" message, and no session.

### Failures at the provider

22. Provider down, slow (no answer in 5 seconds) or discovery URL unreachable when the user clicks the button: the user returns to the login page with the message "We could not reach <display name>. Try again later or use another sign-in method." Today next-auth sends `?error=OAuthSignin` to `/auth/login`, and `login-view.tsx` does not read `error` from the URL, so the user sees nothing. The login page must read and show `OAuthSignin`, `OAuthCallback` and `AccessDenied`.
23. Wrong client secret or wrong client ID: the token exchange fails, and the user sees "Sign-in with <display name> is not set up correctly. Contact your administrator." The server logs the provider id and the error code, not the secret.
24. A provider that is disabled or removed while a user is on its login page: the callback is rejected with the message from criterion 23. No user is created.
25. A request to `/api/auth/signin/<id>` for a disabled or unknown provider id does not start a flow and shows the generic sign-in error.
26. One broken provider does not affect the others or password login. Loading the provider list from the database must not throw; a provider whose secret fails to decrypt is skipped and logged.

### Existing accounts and conflicts

27. A first OIDC login whose verified email matches an existing Cal.diy user who has no link to this provider follows the account-linking rule in ADR-004 (decided by the course staff on 2026-11-12, Q1). When criterion 27a does not allow an auto-link, the login is rejected: the user sees `oidc-account-exists` ("An account with this email already exists. Sign in with your usual method, then link <display name> in Settings → Security."), and nothing changes on the existing account. Sprint 3 ships this reject rule for every match; criterion 27a comes in Sprint 4 (sub-issue 7). This message confirms that an account exists for that email. We accept that, because the user has just proved control of that email at the provider; criterion 18 still hides the domain list.

   27a. Sprint 4. The login in criterion 27 auto-links (adds an `Account` row for (provider id, `sub`) to the existing user and signs that user in) only when all of these hold: the provider's `email_verified` is `true`; the email's domain is on the provider's "domains this provider owns" list (criterion 3a), compared case-insensitively on the full domain after `@`; and the existing user does not have role `ADMIN`. If any condition fails, the login is rejected as in criterion 27. An auto-linked user with Cal.diy 2FA on still gets the TOTP step (criterion 20, subject to criteria 44 to 47). The auto-link does not change the existing user's `identityProvider`, password or email. Unit tests cover each failed condition on its own.

28. OIDC logins never reach the existing shared paths: the `identityProvider + identityProviderId` lookups in `signIn` (`next-auth-options.ts:891–911`, the legacy fix at L914–932) and in `jwt` (L601–612); the "verified and not CAL" branch at L1012; the "CAL user with verified email" re-link at L1051; and the email-based `autoMergeIdentities()` fallback in `jwt` (L594, L615). For `oidc-*` providers the only identity lookup is the `Account` row (provider, `sub`), and `jwt` takes the user id from the `user` that next-auth resolved, never from `token.email`. The adapter's legacy fallback in `next-auth-custom-adapter.ts:90–104` stays limited to Google and SAML. A test proves each path is not reached.
29. An email match with an invited user (no password, not verified, no username; the branch at L1021) accepts the invite when the provider's `email_verified` is `true` (course staff Q8). This holds when "allow new accounts" is off for the provider, and when sign-up is disabled site-wide (criterion 18a). Cal.diy adds an `Account` row for (provider id, `sub`) to the invited user, sets `emailVerified`, the name (criterion 17) and a username, and handles the invite's team memberships the same way as for an invited user who completes sign-up with the invite link. No second user is created. It does not use the L1021 code path (criterion 28). The provider's allowed-domains list does not apply to an invite (team proposal, follow-up F1 in `staff-questions.md`). Sprint 4 (sub-issue 7); until then the Sprint 3 rule in criterion 27 rejects the login.
30. Two providers assert the same email: the user is linked to provider A, and provider B sends the same verified email with a different `sub`. Provider B's login is handled as criterion 27. Provider B never signs the user in through provider A's link. The reverse case is also tested: provider B sends the same `sub` that the user has at provider A; B's login is a new identity and never matches the user.
31. A returning linked user whose email changed at the provider: the user is found by (provider id, `sub`) as in criterion 19, never by email. Cal.diy updates the user's email only if the new email is verified, is not used by another user (compared case-insensitively), and passes the provider's allowed domains. The new email and `email_verified` are read from the raw ID-token claims (`profile`), not from next-auth's `user` object, which holds the stored user once an `Account` row exists. If another user has the new email, or the new email is outside the allowed domains, the login succeeds, the user keeps the old email, and the next page shows a notice: "Your email at <display name> changed to <new email>, but Cal.diy cannot use it. Your Cal.diy email stays <old email>." (course staff Q7; the allowed-domains case is follow-up F5). Nothing else on either user changes. A new email with `email_verified` missing or `false` is rejected by criterion 15.
32. Organization auto-join (`ORGANIZATIONS_AUTOLINK`, L130) does not apply to OIDC users in this feature.

### User account settings

33. **Settings → Security** lists the providers the user is linked to, with the date each was linked.
34. A signed-in user can link an enabled provider from that page. Linking starts the same flow and adds an `Account` row to the signed-in user, even if the provider's email differs from the Cal.diy email. It fails with a message if that (provider, `sub`) is already linked to another user. The reject rule in criterion 27 does not block this flow: `signIn` knows the signed-in user's id and allows the link when the email match is that same user. The link flow sends `prompt=login`, so a browser already signed in at the provider as someone else cannot attach that identity silently, and the page shows the provider's email before it confirms.
35. A user can unlink a provider only if another login method remains: a password, another linked provider, Google or Microsoft. Otherwise the unlink button is disabled, and the page explains how to set a password first (the existing `createAccountPassword` flow).

### Provider removal and old data

36. Removing a provider that has linked users requires the admin to type the provider's display name. The confirmation shows how many users are linked and how many of them have no other login method.

   36a. The remove confirmation also offers "Disable instead" as its first button. It does what criterion 38 says and deletes nothing (course staff Q5).

37. Removing a provider deletes its `Account` rows. Users whose only login was that provider keep their account and data. They can recover with "Forgot password" (criterion 37a).

   37a. A user created through OIDC has no password. For that user, "Forgot password" sends the reset email, the link in it sets a password, and the user can then log in with email and password. This holds while the provider exists and after it is removed. The reset sets `identityProvider = CAL` (`apps/web/app/api/auth/reset-password/route.ts:79`); a remaining OIDC link still works, because OIDC lookups use the `Account` row (criterion 19). A test proves each step for a user with `identityProvider = OIDC` and no password (course staff Q5).

38. Disabling a provider hides its button and blocks its logins, and keeps its links, so enabling it again restores access.
39. Upgrading an instance that has users and no providers: the migration adds an empty provider table and one enum value. Login, sign-up, sessions, Google, Microsoft and password login behave exactly as before. No existing row changes.
40. Downgrading after providers exist is not supported. The migration notes say so.

### Password login and lock-out (Sprint 4)

41. An instance setting "disable password login" (course staff Q4, Sprint 4) hides the password form and rejects password logins for users without role `ADMIN`. It can be turned on only while at least one provider is enabled and the admin who turns it on is linked to an enabled provider. Users with role `ADMIN` can always log in with a password, so an admin cannot lock every admin out.

### Test setup

42. A Keycloak instance runs locally from a separate compose file with a realm export that has three test users: verified email, unverified email, and no email claim. The README gives the steps from a clean clone to a working login in under 15 minutes, and the commands to run the unit and end-to-end tests against it, so that any teammate can run the tests (course staff Q12). A teammate other than the author follows it once and records the result. Keycloak is the only reference provider (Q12).
43. Unit tests cover the provider service (validation, encryption, discovery test results), the identity-provider mapping, and each `signIn` branch above. An end-to-end test against Keycloak covers criteria 14 and 15.

### Provider MFA (Sprint 4)

Added after course staff Q6 (2026-11-12). What counts as a second factor: ADR-010.

44. A provider has the setting "accept this provider's MFA" (criterion 3a), default off. Only an admin can change it, on the provider form.
45. When the setting is on and the ID token's `amr` claim shows a second factor (ADR-010), the login skips the Cal.diy TOTP step, and the site-wide "require 2FA" setting (#112) does not ask that user to set up Cal.diy 2FA for that session. `amr` is read from the verified ID token only, never from userinfo.
46. When the setting is off, or `amr` is missing, empty, not a list of strings, or shows only a password, the login applies Cal.diy 2FA as for a password user: the TOTP step when the user has 2FA on (criterion 20), and the required-setup step when the site-wide "require 2FA" setting is on. This changes today's rule in `requiresTwoFactorSetup`, which exempts every non-`CAL` user. (Team reading of the answer; follow-up F3 in `staff-questions.md`.)
47. Unit tests cover: setting off with a second factor in `amr`; setting on with `["mfa"]`; setting on with `["pwd"]`; setting on with `amr` missing; setting on with unknown values only. The Keycloak realm (criterion 42) gets one user with OTP set up for a manual check.

## Answers to the open questions in #131

The course staff (`ojcchar`) answered on #131 on 2026-11-12. The Q numbers are those in `staff-questions.md`. Two rows were not asked as separate questions; the course staff did not object to them, and they stay team decisions.

| #131 question | Answer (2026-11-12) | Criteria |
|---|---|---|
| Same email already exists; how to prevent takeover? | Q1, course staff: auto-link only when the email is verified and the admin marked the provider as owning that domain; otherwise reject and the user links from settings; never auto-link an `ADMIN` account. Sprint 3 rejects every match; auto-link is Sprint 4. | 27, 27a, 28–30, 3a |
| Who may create an account through OIDC? | Q2, course staff: per provider "allow new accounts" (default off) plus an optional allowed-domains list. The site-wide "disable signup" setting also blocks OIDC sign-up and wins over the provider switch. Invites are the exception (Q8). | 12, 14, 18, 18a, 29 |
| What does the user see if the provider is down or misconfigured? | Not asked separately; team decision. A message that names the provider and offers other sign-in methods; admins get a test button. | 5, 22–26 |
| More than one provider? Turn off password login? | Q11 and Q4, course staff: up to 10 is enough. Password-login switch in Sprint 4; admins always keep password login. | 9, 41 |
| How are secrets stored, who can see them? | Not asked separately; team decision. Encrypted with the instance key; write-only in the UI; only `ADMIN` can change them; no one can read them back. | 6 |
| Unlink? Only login method? | Q10, course staff: agreed. Yes, unless it is the last login method. | 35 |
| Groups to roles? | Q9, course staff: agreed. No group mapping in Sprints 3–4; recorded in future work. | none |
| How to test without a real IdP? | Q12, course staff: Keycloak is enough. Document the setup so that anyone on the team can run the tests. | 42–43 |
| Existing data after upgrade? | Q13, course staff: agreed. No behaviour change until an admin adds a provider. | 39–40 |

## Open questions not listed in #131

These came from reading the code. The course staff answered all but the last two on 2026-11-12.

- Does the site-wide "require 2FA" rule (#112, PR #120) apply to OIDC users? Q6, course staff: rely on the provider's MFA only when it can be checked. A per-provider setting "accept this provider's MFA"; with it on and a second factor in `amr`, skip Cal.diy 2FA; otherwise require Cal.diy 2FA. Sprint 4. Criteria 44–47, ADR-010.
- Some providers do not send `email_verified`. Q3, course staff: reject the login when it is missing or false. No admin option to treat emails as verified. Criterion 15.
- Should a returning user's email follow the provider when it changes? Q7, course staff: yes, matched by `sub`, never by email; if the new email is taken, keep the old one and tell the user. Criterion 31.
- Is an invited user (L1021) a free claim for anyone whose provider asserts that email? Q8, course staff: a verified OIDC login with the invited email accepts the invite, even when "allow new accounts" is off. Criterion 29.
- What does the user see after removal of their only login method? Q5, course staff: agreed, and "Forgot password" must be proven to work for users with no password; admins can disable in place of delete. Criteria 36a, 37, 37a, 38.
- Should OIDC users be put into an organization by email domain? Not asked. Team proposal: no in this feature (criterion 32). Follow-up F6.
- The answers to Q6, Q7 and Q8 leave smaller points open. They are follow-ups F1 to F5 in `staff-questions.md`; the criteria use the team proposal until the course staff answers.

## Technical Design

### Database Changes (needs a yes before any edit to `schema.prisma`)

- Add `OIDC` to `enum IdentityProvider` (`schema.prisma:367`).
- Add model `OidcProvider`: `id` (cuid, immutable, used in the NextAuth provider id `oidc-<id>`), `displayName`, `issuer`, `clientId`, `clientSecretEncrypted`, `scopes`, `allowSignup` (default false), `allowedDomains` (String[]), `enabled` (default false), `position` (Int), `createdAt`, `updatedAt`, `updatedById`.
- Sprint 4 adds two columns to `OidcProvider` (criterion 3a): `ownedDomains` (String[], default empty; ADR-011) and `acceptProviderMfa` (Boolean, default false; ADR-010). #136 does not have them. Either #136 adds them before it merges, or the first Sprint 4 sub-issue that needs them (7 or the MFA work) adds a second migration. To agree with the #136 owner.
- No change to `User` or `Account`. The link is an `Account` row with `provider = "oidc-<id>"` and `providerAccountId = sub`. `@@unique([provider, providerAccountId])` (L1258) already makes one `sub` belong to one user per provider. See ADR-002.

### Server

- `PrismaOidcProviderRepository` (data access only) and `OidcProviderService` (validation, encryption, discovery test), wired with the moduleLoader DI pattern in `packages/features/auth/oidc/di/`.
- `apps/web/pages/api/auth/[...nextauth].ts` becomes an async handler that loads enabled providers and passes them to `getOptions`. `getOptions` gains a `dynamicProviders` argument and stays synchronous. See ADR-001.
- Each provider becomes a NextAuth `type: "oauth"` provider with `wellKnown`, `idToken: true`, `checks: ["pkce", "state"]`, and **no** `allowDangerousEmailAccountLinking`. `httpOptions.timeout` is set to 5000 ms (to confirm the option name for next-auth 4.24.13).
- `getIdentityProvider` maps any id that starts with `oidc-` to `IdentityProvider.OIDC`. `signIn` gets a separate OIDC branch before the shared code, so OIDC never reaches the auto-merge branches (criterion 28). The `jwt` callback resolves OIDC users through the `Account` row, not through `token.email`.
- New-user and link paths call `calcomAdapter.linkAccount` inside `signIn`, in the same transaction as any user write, so that next-auth's own callback handler finds the account by (provider, `sub`) and does not need email linking. Confirmed in the next-auth 4.24.13 source by the Deep review: `routes/callback` calls `getUserByAccount`, then the `signIn` callback, then `callbackHandler`, which looks up the account again before any email match. In `signIn`, `user` is the stored user when an `Account` row exists, otherwise the `profile()` output; `profile` holds the raw ID-token claims.
- `signIn` receives no session. `getOptions` gains a `getSessionUserId` getter (like `getDubId`), so the OIDC branch can tell a settings link (criterion 34) from a login.
- Admin tRPC procedures under `viewer.admin`: `oidcProviders.list`, `create`, `update`, `setEnabled`, `delete`, `testDiscovery`. All use `authedAdminProcedure`. List returns a DTO without the secret.
- Public read for the login and sign-up pages: id and display name of enabled providers only, read in `getServerSideProps`.

### UI

- Admin: new page `apps/web/app/(use-page-wrapper)/settings/(admin-layout)/admin/identity-providers/page.tsx` (role check here), view in `apps/web/modules/settings/admin/identity-providers-view.tsx`. Follows `security/page.tsx`.
- Login: buttons in `apps/web/modules/auth/login-view.tsx` after the Microsoft button (~L215), using `signIn("oidc-<id>")` and `useLastUsed`. Read `error` from the URL and show it.
- Error page: add messages for `missing-email`, `oidc-signup-not-allowed`, `oidc-account-exists`, `unknown-provider` in `apps/web/app/(use-page-wrapper)/auth/error/page.tsx`.
- Settings → Security: "Connected logins" section (Sprint 4).
- Every string goes in `packages/i18n/locales/en/common.json`. The existing `sso_oidc_*` strings belong to the removed team SSO feature; reuse `sso_oidc_callback_copied` only.

## Edge Cases

Covered by the criteria above. The short list:

- Provider down, slow, unreachable discovery, bad secret, issuer mismatch: 5, 22–26.
- Unverified, missing email, missing name: 15–17.
- Email matches an existing account, invited user, two providers with one email: 27, 27a, 28–30.
- Sign-up disabled site-wide while a provider allows new accounts: 18a.
- Email change at the provider, including a taken new email: 31.
- Provider disabled or removed with dependent users; only-login users with no password: 24, 36, 36a, 37, 37a, 38.
- Provider MFA missing, password-only or unknown in `amr`: 44–47.
- Admin lock-out: 41.
- Upgrade with old data: 39–40.
- Missing encryption key: 10.
- Concurrent admin edits: 8.

## Out of Scope

- SAML changes (#131).
- Single logout at the provider (#131).
- Changes to Google or Microsoft login, including their `allowDangerousEmailAccountLinking: true`.
- Mapping provider groups or claims to Cal.diy roles or teams.
- Organization or team-level SSO (the old Jackson-based feature).
- Per-provider button icons or colors.
- API v2 endpoints for provider management.
