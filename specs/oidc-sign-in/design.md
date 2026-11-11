# OIDC Sign-In Design

Issue: #131. Sprints 3 and 4. Status: **draft, waiting for customer answers** (see `customer-questions.md`).

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

### Provider configuration (admin)

1. An admin can add, edit, enable, disable and remove a provider at **Settings → Admin → Identity providers**. Each change takes effect on the next login request, with no environment change and no restart.
2. The page is visible only to users with role `ADMIN`. The role check is in `page.tsx`. Every tRPC procedure behind it uses `authedAdminProcedure`. A non-admin who calls a procedure directly gets `FORBIDDEN` and no data.
3. A provider has: display name (1–50 characters), issuer URL, client ID, client secret, scopes (default `openid email profile`), "allow new accounts" (default off), "allowed email domains" (optional list), and enabled (default off). Each field is validated, and an invalid field shows a message next to it. Save is blocked until every field is valid.
4. The issuer URL must be `https`. `http` is accepted only for `localhost`, `127.0.0.1` or a `*.localhost` host, so that a local test provider works. Scopes must include `openid`.
5. **Test connection** fetches `<issuer>/.well-known/openid-configuration` from the server with a 5-second timeout. It reports one of: OK; unreachable (network error or timeout); not a discovery document (bad JSON or missing `authorization_endpoint`, `token_endpoint` or `jwks_uri`); issuer mismatch (the document's `issuer` is not the configured issuer); `authorization_code` grant or `code` response type not supported. Saving does not require a passing test, but enabling a provider does.
6. The client secret is encrypted at rest with `symmetricEncrypt` and `CALENDSO_ENCRYPTION_KEY`. No API response, log line, page source or error message contains the secret, encrypted or plain. The edit form shows "Secret is set" and a "Replace secret" field; leaving it empty keeps the stored secret.
7. The page shows the callback URL (`<WEBAPP_URL>/api/auth/callback/<provider id>`) with a copy button, before and after the first save.
8. Two admins who edit the same provider at the same time: the later save wins, and the page shows the saved values after reload. (No merge.)
9. At most 10 providers can exist. Adding an eleventh shows a message and saves nothing.
10. If `CALENDSO_ENCRYPTION_KEY` is missing or not 32 bytes, the page shows an error that names the variable, and add or edit of a secret is blocked. Existing password, Google and Microsoft login keep working.

### Login and sign-up

11. The login page shows one "Continue with <display name>" button for each enabled provider, in the order the admin set, below the Google and Microsoft buttons. The button text uses the translated template `continue_with_provider`; only the display name comes from the admin. With no enabled provider, the login page looks exactly as it does today.
12. The sign-up page shows the same buttons only for providers with "allow new accounts" on.
13. Clicking a button starts an authorization code flow with PKCE and `state` checks. User data comes from the ID token claims (`idToken: true`).
14. A first login with a verified email, no existing Cal.diy user with that email, "allow new accounts" on, and the email domain on the allowed list (or no list): Cal.diy creates a user with `identityProvider = OIDC`, `identityProviderId = null`, `emailVerified` set, the name from the `name` claim, and an `Account` row for (provider id, `sub`). The user and the `Account` row are created in one transaction, so a failed link leaves no orphan user that owns the email. The user lands in onboarding.
15. A login where `email_verified` is missing or `false` is rejected with `/auth/error?error=unverified-email` and the existing message `unverified_email_oauth_error`. No user and no `Account` row is created or changed.
16. A login with no `email` claim is rejected with a new error `missing-email` and a message that tells the user to ask their admin to release the email claim. Nothing is created.
17. A login with no `name` claim does not fail. The name falls back to `preferred_username`, then to the part of the email before `@`. (Today `signIn` returns `false` for a missing name, at `next-auth-options.ts:847`.)
18. A first login when "allow new accounts" is off, or the email domain is not on the allowed list, is rejected with a new error `oidc-signup-not-allowed`. The message says the account does not exist and names no reason that would reveal the domain list.
19. A returning linked user signs in as the user that owns the `Account` row, found by (provider id, `sub`), never by email. This holds after the user's email changes at the provider.
20. A linked user with Cal.diy 2FA enabled still gets the TOTP step (`loginWithTotp`), as Google users do today.
21. A user who sends a forged or expired `state`, or replays a callback, gets the login page with a "sign-in failed, try again" message, and no session.

### Failures at the provider

22. Provider down, slow (no answer in 5 seconds) or discovery URL unreachable when the user clicks the button: the user returns to the login page with the message "We could not reach <display name>. Try again later or use another sign-in method." Today next-auth sends `?error=OAuthSignin` to `/auth/login`, and `login-view.tsx` does not read `error` from the URL, so the user sees nothing. The login page must read and show `OAuthSignin`, `OAuthCallback` and `AccessDenied`.
23. Wrong client secret or wrong client ID: the token exchange fails, and the user sees "Sign-in with <display name> is not set up correctly. Contact your administrator." The server logs the provider id and the error code, not the secret.
24. A provider that is disabled or removed while a user is on its login page: the callback is rejected with the message from criterion 23. No user is created.
25. A request to `/api/auth/signin/<id>` for a disabled or unknown provider id does not start a flow and shows the generic sign-in error.
26. One broken provider does not affect the others or password login. Loading the provider list from the database must not throw; a provider whose secret fails to decrypt is skipped and logged.

### Existing accounts and conflicts

27. A first OIDC login whose verified email matches an existing Cal.diy user who has no link to this provider follows the account-linking rule in ADR-004. **Until the customer answers Q1, the rule is "reject": the user sees `oidc-account-exists` ("An account with this email already exists. Sign in with your usual method, then link <display name> in Settings → Security.")**, and nothing changes on the existing account. This message confirms that an account exists for that email. We accept that, because the user has just proved control of that email at the provider; criterion 18 still hides the domain list.
28. OIDC logins never reach the existing shared paths: the `identityProvider + identityProviderId` lookups in `signIn` (`next-auth-options.ts:891–911`, the legacy fix at L914–932) and in `jwt` (L601–612); the "verified and not CAL" branch at L1012; the "CAL user with verified email" re-link at L1051; and the email-based `autoMergeIdentities()` fallback in `jwt` (L594, L615). For `oidc-*` providers the only identity lookup is the `Account` row (provider, `sub`), and `jwt` takes the user id from the `user` that next-auth resolved, never from `token.email`. The adapter's legacy fallback in `next-auth-custom-adapter.ts:90–104` stays limited to Google and SAML. A test proves each path is not reached.
29. An email match with an invited user (no password, not verified, no username; the branch at L1021) is treated as an existing account, not as a free claim, unless the customer says otherwise (Q1).
30. Two providers assert the same email: the user is linked to provider A, and provider B sends the same verified email with a different `sub`. Provider B's login is handled as criterion 27. Provider B never signs the user in through provider A's link. The reverse case is also tested: provider B sends the same `sub` that the user has at provider A; B's login is a new identity and never matches the user.
31. A returning linked user whose email changed at the provider: Cal.diy updates the user's email only if the new email is verified, is not used by another user (compared case-insensitively), and passes the provider's allowed domains. The new email and `email_verified` are read from the raw ID-token claims (`profile`), not from next-auth's `user` object, which holds the stored user once an `Account` row exists. If another user has the new email, the login is rejected with `new-email-conflict` (existing message) and nothing changes.
32. Organization auto-join (`ORGANIZATIONS_AUTOLINK`, L130) does not apply to OIDC users in this feature.

### User account settings

33. **Settings → Security** lists the providers the user is linked to, with the date each was linked.
34. A signed-in user can link an enabled provider from that page. Linking starts the same flow and adds an `Account` row to the signed-in user, even if the provider's email differs from the Cal.diy email. It fails with a message if that (provider, `sub`) is already linked to another user. The reject rule in criterion 27 does not block this flow: `signIn` knows the signed-in user's id and allows the link when the email match is that same user. The link flow sends `prompt=login`, so a browser already signed in at the provider as someone else cannot attach that identity silently, and the page shows the provider's email before it confirms.
35. A user can unlink a provider only if another login method remains: a password, another linked provider, Google or Microsoft. Otherwise the unlink button is disabled, and the page explains how to set a password first (the existing `createAccountPassword` flow).

### Provider removal and old data

36. Removing a provider that has linked users requires the admin to type the provider's display name. The confirmation shows how many users are linked and how many of them have no other login method.
37. Removing a provider deletes its `Account` rows. Users whose only login was that provider keep their account and data. They can recover with "Forgot password", because `createAccountPassword` already serves non-`CAL` users. (To confirm in implementation: the forgot-password email reaches `OIDC` users.)
38. Disabling a provider hides its button and blocks its logins, and keeps its links, so enabling it again restores access.
39. Upgrading an instance that has users and no providers: the migration adds an empty provider table and one enum value. Login, sign-up, sessions, Google, Microsoft and password login behave exactly as before. No existing row changes.
40. Downgrading after providers exist is not supported. The migration notes say so.

### Password login and lock-out (Sprint 4, waits on Q4)

41. If the customer wants a "disable password login" switch: it can be turned on only while at least one provider is enabled and the admin who turns it on is linked to an enabled provider. Users with role `ADMIN` can always log in with a password, so an admin cannot lock every admin out.

### Test setup

42. A Keycloak instance runs locally from a separate compose file with a realm export that has three test users: verified email, unverified email, and no email claim. The README gives the steps from a clean clone to a working login in under 15 minutes.
43. Unit tests cover the provider service (validation, encryption, discovery test results), the identity-provider mapping, and each `signIn` branch above. An end-to-end test against Keycloak covers criteria 14 and 15.

## Proposed answers to the open questions in #131

Each answer is a proposal. **Every one needs customer confirmation**; the questions are in `customer-questions.md`.

| #131 question | Proposed answer | Criteria |
|---|---|---|
| Same email already exists; how to prevent takeover? | Do not auto-link by email by default. Reject and require linking from settings, or auto-link only for domains the admin marks as owned by that provider. Never auto-link to an `ADMIN` account. Needs customer confirmation. | 27–30 |
| Who may create an account through OIDC? | Per provider: "allow new accounts" (default off) plus an optional allowed-domains list. Needs customer confirmation, including whether `NEXT_PUBLIC_DISABLE_SIGNUP` also blocks OIDC sign-up. | 12, 14, 18 |
| What does the user see if the provider is down or misconfigured? | A message that names the provider and offers other sign-in methods; admins get a test button. Needs customer confirmation of wording only. | 5, 22–26 |
| More than one provider? Turn off password login? | Yes, up to 10. Password-login switch only in Sprint 4, with an admin break-glass rule. Needs customer confirmation. | 9, 41 |
| How are secrets stored, who can see them? | Encrypted with the instance key; write-only in the UI; only `ADMIN` can change them; no one can read them back. Needs customer confirmation. | 6 |
| Unlink? Only login method? | Yes, unless it is the last login method. Needs customer confirmation. | 35 |
| Groups to roles? | No in Sprints 3–4. Record in future work. Needs customer confirmation. | none |
| How to test without a real IdP? | Local Keycloak with a realm export. Needs customer confirmation that Keycloak is acceptable as the reference provider. | 42–43 |
| Existing data after upgrade? | No behavior change until an admin adds a provider. Needs customer confirmation. | 39–40 |

## Open questions not listed in #131

These came from reading the code. They are also in `customer-questions.md`.

- Does the site-wide "require 2FA" rule (#112, PR #120) apply to OIDC users? Today `requiresTwoFactorSetup` exempts every non-`CAL` user, so OIDC users would be exempt. Proposed: exempt, because the provider owns MFA.
- Some providers do not send `email_verified`. Should an admin be able to mark a provider as "emails are always verified"? Proposed: no, because that is the takeover path.
- Should a returning user's email follow the provider when it changes? Proposed: yes, with the checks in criterion 31.
- Is an invited user (L1021) a free claim for anyone whose provider asserts that email? Proposed: no.
- Should OIDC users be put into an organization by email domain? Proposed: no in this feature.
- What does the user see after removal of their only login method? Proposed: criterion 37.

## Technical Design

### Database Changes (needs a yes before any edit to `schema.prisma`)

- Add `OIDC` to `enum IdentityProvider` (`schema.prisma:367`).
- Add model `OidcProvider`: `id` (cuid, immutable, used in the NextAuth provider id `oidc-<id>`), `displayName`, `issuer`, `clientId`, `clientSecretEncrypted`, `scopes`, `allowSignup` (default false), `allowedDomains` (String[]), `enabled` (default false), `position` (Int), `createdAt`, `updatedAt`, `updatedById`.
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
- Email matches an existing account, invited user, two providers with one email: 27–30.
- Email change at the provider: 31.
- Provider disabled or removed with dependent users; only-login users: 24, 36–38.
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
