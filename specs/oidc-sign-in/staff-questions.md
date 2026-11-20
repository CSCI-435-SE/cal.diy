# Questions for the course staff (#131)

Status: all 13 questions answered by `ojcchar` on #131 on 2026-11-12. The questions were posted on #131 by `zach-short` on 2026-11-11, in a shorter wording than the draft below; the numbers match. Each answer below is a summary of the course staff's comment. Where an answer changed or added behaviour, the spec criteria named after "Spec" were changed or added (numbers in `design.md`).

Follow-up questions that the answers leave open are at the end of this file. They are not posted yet.

---

Hi @ojcchar, before we finish the spec for #131 we need your decision on the points below. For each one we give our proposal; please confirm it or tell us what you want instead. Q1 and Q2 block implementation.

**Blocking**

1. **Same email as an existing account.** Someone logs in with OIDC for the first time, and the provider says their verified email is `ana@uni.edu`. A Cal.diy account with `ana@uni.edu` already exists and is not linked to that provider. Any provider an admin adds can assert any email, so merging on email alone lets a misconfigured provider take over accounts. We propose:
   - (a) The admin lists the email domains each provider owns (for example `uni.edu`). A verified email in that list links to the existing account automatically.
   - (b) Any other match is rejected with a message telling the user to sign in their usual way and link the provider in Settings → Security.
   - (c) Accounts with the admin role never link automatically.

   Is this what you want? Or should every match be rejected (only (b)), or should every verified match link?

   **Answer (answered 2026-11-12):** Agreed. Auto-link only when the email is verified and the admin marked the provider as owning that email domain. Otherwise reject, and the user links the provider from settings. Never auto-link an admin account. Spec: criteria 27, 27a, 3a; ADR-004, ADR-011.
2. **Who may create a new account through OIDC?** We propose a per-provider switch "allow new accounts" (off by default) and an optional list of allowed email domains. Is that right? Should the existing instance setting that disables sign-up also block OIDC sign-up?

   **Answer (answered 2026-11-12):** Agreed on the per-provider switch (off by default) and the allowed domains. The global "disable signup" setting also blocks OIDC sign-up, and it wins over the provider switch. Invited users are the exception (Q8). Spec: criteria 12, 18, 18a.

**Need an answer this sprint**

3. **Providers that do not send `email_verified`.** Some providers leave out this claim. We propose to reject those logins (the #131 criterion), with no admin option to treat emails as verified. Do you agree?

   **Answer (answered 2026-11-12):** Yes. Reject the login when `email_verified` is missing or false. Spec: criterion 15 (no change).
4. **Turning off password login.** Do you want a switch that disables password login when OIDC is set up? If yes, we propose that users with the admin role can always log in with a password, so no one can lock every admin out. We plan this for Sprint 4.

   **Answer (answered 2026-11-12):** Yes, in Sprint 4. Admins always keep password login. Spec: criterion 41.
5. **Removing a provider.** When an admin removes a provider that users log in with, we propose: show how many users are linked and how many have no other login; require the admin to type the provider name; keep those users' accounts and data; and let them set a password with "Forgot password". Disabling a provider (hide it, keep links) is offered first. Is that right?

   **Answer (answered 2026-11-12):** Fine, with two additions. Users created through OIDC have no password, so the team must prove that "Forgot password" works for them, with a test. Admins can also disable a provider in place of deleting it. Spec: criteria 36a, 37, 37a, 38.
6. **Two-factor authentication.** The site-wide "require 2FA" setting (#112) applies only to password users today. Should OIDC users also be forced to set up Cal.diy 2FA, or does their identity provider's MFA count?

   **Answer (answered 2026-11-12):** Rely on the provider's MFA when it can be checked. Add a per-provider setting "accept this provider's MFA". When it is on and the ID token's `amr` claim shows a second factor, skip Cal.diy 2FA. When `amr` is missing or shows only a password, require Cal.diy 2FA. Sprint 4. Spec: criteria 3a, 44 to 47; ADR-010.
7. **Email changes at the provider.** A linked user's email changes at the provider. We propose to update the Cal.diy email at the next login if the new email is verified, not used by another account, and in the provider's allowed domains. Otherwise the login is rejected. Do you agree?

   **Answer (answered 2026-11-12):** Fine, as long as accounts are matched by the provider's user ID (the `sub` claim), never by email. If the new email is already taken, keep the old email and tell the user. Spec: criteria 19 (no change), 31 (changed: the login is no longer rejected).
8. **Invited users.** An admin or team invited `bo@uni.edu`, who has not accepted yet. Should the first OIDC login with that email take over the invited account, or be treated like Q1?

   **Answer (answered 2026-11-12):** A verified OIDC login with an invited email accepts the invite, even when "allow new accounts" is off for that provider. Spec: criterion 29 (changed), 18a.

**Can wait for Sprint 4**

9. **Groups to roles.** We propose that provider groups do not give Cal.diy roles in this feature (recorded as future work). Do you agree?

   **Answer (answered 2026-11-12):** Agreed. No group mapping for now.
10. **Unlinking.** We propose that a user can unlink a provider in Settings → Security unless it is their only way to log in; then they must set a password first. Do you agree?

    **Answer (answered 2026-11-12):** Agreed. Spec: criterion 35 (no change).
11. **Number of providers.** We propose up to 10 providers, shown on the login page in an order the admin sets. Is that enough?

    **Answer (answered 2026-11-12):** Yes, 10 is enough. Spec: criterion 9 (no change).
12. **Test provider.** We will test against Keycloak running locally. Is Keycloak acceptable as the reference provider, or do you want us to test Authentik or Okta too?

    **Answer (answered 2026-11-12):** Keycloak is fine. Document the setup so that anyone on the team can run the tests. Spec: criterion 42 (changed).
13. **Upgrade.** After the upgrade, nothing changes until an admin adds a provider. Downgrading after providers exist is not supported. Is that acceptable?

    **Answer (answered 2026-11-12):** Agreed. Spec: criteria 39, 40 (no change).

Thanks!

---

## Follow-up questions (not posted)

The answers leave these points open. Each has the team's proposal, which the spec uses until the course staff answers. Post them on #131 as one comment after the team agrees.

- F1 (from Q8). Does an invite also skip the provider's allowed-domains list and the global "disable signup" setting? Proposed: yes to both, because the admin or team chose that exact email (criterion 18a).
- F2 (from Q8). Can an invite be accepted through auto-link when the invited email is on a domain the provider does not own? Proposed: yes, because criterion 29 needs only a verified email that equals the invited email.
- F3 (from Q6). "Require Cal.diy's 2FA" when `amr` shows no second factor: does it mean the TOTP step only for users who already set up 2FA, plus forced setup only when the site-wide "require 2FA" setting is on? Or does it force every such OIDC user to set up 2FA? Proposed: the first (criterion 46).
- F4 (from Q6). Which `amr` values count as a second factor? Proposed in ADR-010: `mfa`, or two or more different values with at least one that is not a knowledge factor.
- F5 (from Q7). If the new email at the provider is outside the provider's allowed domains, should Cal.diy keep the old email and tell the user, as for a taken email? Proposed: yes (criterion 31).
- F6 (not asked before). Should OIDC users join an organization by email domain? Proposed: no in this feature (criterion 32).
