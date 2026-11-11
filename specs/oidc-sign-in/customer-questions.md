# Questions for the customer (#131)

Draft. Paste the block below as a comment on #131 only after the team agrees. Q1 and Q2 block implementation of account linking and sign-up rules; the Sprint 3 slice uses the safe default shown, so it does not wait.

---

Hi @ojcchar, before we finish the spec for #131 we need your decision on the points below. For each one we give our proposal; please confirm it or tell us what you want instead. Q1 and Q2 block implementation.

**Blocking**

1. **Same email as an existing account.** Someone logs in with OIDC for the first time, and the provider says their verified email is `ana@uni.edu`. A Cal.diy account with `ana@uni.edu` already exists and is not linked to that provider. Any provider an admin adds can assert any email, so merging on email alone lets a misconfigured provider take over accounts. We propose:
   - (a) The admin lists the email domains each provider owns (for example `uni.edu`). A verified email in that list links to the existing account automatically.
   - (b) Any other match is rejected with a message telling the user to sign in their usual way and link the provider in Settings → Security.
   - (c) Accounts with the admin role never link automatically.

   Is this what you want? Or should every match be rejected (only (b)), or should every verified match link?
2. **Who may create a new account through OIDC?** We propose a per-provider switch "allow new accounts" (off by default) and an optional list of allowed email domains. Is that right? Should the existing instance setting that disables sign-up also block OIDC sign-up?

**Need an answer this sprint**

3. **Providers that do not send `email_verified`.** Some providers leave out this claim. We propose to reject those logins (the #131 criterion), with no admin option to treat emails as verified. Do you agree?
4. **Turning off password login.** Do you want a switch that disables password login when OIDC is set up? If yes, we propose that users with the admin role can always log in with a password, so no one can lock every admin out. We plan this for Sprint 4.
5. **Removing a provider.** When an admin removes a provider that users log in with, we propose: show how many users are linked and how many have no other login; require the admin to type the provider name; keep those users' accounts and data; and let them set a password with "Forgot password". Disabling a provider (hide it, keep links) is offered first. Is that right?
6. **Two-factor authentication.** The site-wide "require 2FA" setting (#112) applies only to password users today. Should OIDC users also be forced to set up Cal.diy 2FA, or does their identity provider's MFA count?
7. **Email changes at the provider.** A linked user's email changes at the provider. We propose to update the Cal.diy email at the next login if the new email is verified, not used by another account, and in the provider's allowed domains. Otherwise the login is rejected. Do you agree?
8. **Invited users.** An admin or team invited `bo@uni.edu`, who has not accepted yet. Should the first OIDC login with that email take over the invited account, or be treated like Q1?

**Can wait for Sprint 4**

9. **Groups to roles.** We propose that provider groups do not give Cal.diy roles in this feature (recorded as future work). Do you agree?
10. **Unlinking.** We propose that a user can unlink a provider in Settings → Security unless it is their only way to log in; then they must set a password first. Do you agree?
11. **Number of providers.** We propose up to 10 providers, shown on the login page in an order the admin sets. Is that enough?
12. **Test provider.** We will test against Keycloak running locally. Is Keycloak acceptable as the reference provider, or do you want us to test Authentik or Okta too?
13. **Upgrade.** After the upgrade, nothing changes until an admin adds a provider. Downgrading after providers exist is not supported. Is that acceptable?

Thanks!

---
