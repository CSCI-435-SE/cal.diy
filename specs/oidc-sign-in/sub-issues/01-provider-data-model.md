# Sub-issue 1 (draft): OIDC provider data model and repository

Draft body for the GitHub sub-issue. The owner refines it, posts it as an issue linked to #131, and gets a spec review before code. Criteria numbers in brackets refer to `specs/oidc-sign-in/design.md`. Line numbers are from `origin/main` at `247b769fce`.

**Needs a yes before any edit to `packages/prisma/schema.prisma`** (project rule).

---

### Is your proposal related to a problem?

#131 lets an admin add OIDC providers at run time. Today the only providers are hard-coded and configured with environment variables, and the database has no place to store a provider, its client secret, or its sign-up rules. `IdentityProvider` (`schema.prisma:367`) has no value for an OIDC user. Every other #131 sub-issue (admin backend, admin page, login flow) reads or writes this data, so it comes first.

### Describe the solution you would like

Add an `OIDC` value to `IdentityProvider` and a new `OidcProvider` table with a migration. Add `PrismaOidcProviderRepository`, wired with the moduleLoader DI pattern, that is the only code that reads or writes the table. It returns DTOs, never Prisma types. The client secret is stored only as ciphertext; encrypting it is the admin service's job (sub-issue 3), not the repository's.

### User story

As a developer on the #131 sub-issues, I want one repository for OIDC providers, so that the admin backend and the login flow read the same data in the same way and the secret cannot leak through a query that selects too much.

### User scenario

The admin service (sub-issue 3) calls `create` with an encrypted secret. The login route (sub-issue 5) calls `findEnabled` on each auth request and gets the enabled providers in display order, without their secrets, then calls `findByIdWithEncryptedSecret` for the one provider whose flow it builds. When an admin removes a provider, the service calls `deleteWithAccounts`, and the provider and every user link to it go in one transaction.

### Scope

Medium. It touches the Prisma schema and one migration, a new repository with its DTO, the DI module and container, and unit tests. I expect 6 to 8 files and about 300 changed lines, half of them tests. It adds no UI and no tRPC route.

### Acceptance criteria

1. A migration adds `OIDC` to `IdentityProvider` and creates `OidcProvider` with: `id` (cuid, primary key), `displayName` (text), `issuer` (text), `clientId` (text), `clientSecretEncrypted` (text), `scopes` (text), `allowSignup` (boolean), `allowedDomains` (text array), `enabled` (boolean), `position` (integer), `createdAt`, `updatedAt`, `updatedById` (nullable integer).
2. New rows get these defaults: `scopes = "openid email profile"`, `allowSignup = false`, `allowedDomains = []`, `enabled = false`, `position = 0`.
3. Two providers cannot have the same `issuer` and `clientId`. A second insert with the same pair fails with a unique-constraint error, and the repository turns it into an `ErrorWithCode` with a message that names the issuer, not the secret.
4. The migration applies to a database that already has users and accounts, and changes no existing row. `CAL`, `GOOGLE`, `SAML` and `AZUREAD` users keep their values. [39]
5. `findEnabled()` returns only enabled providers, ordered by `position` and then `createdAt`, as `OidcProviderPublicDto` (`id`, `displayName`, `issuer`, `clientId`, `scopes`, `allowSignup`, `allowedDomains`). It never selects `clientSecretEncrypted`. [6, 11]
6. `list()` returns every provider (enabled or not) in the same order and shape as criterion 5, plus `enabled`, `createdAt` and `updatedAt`. It never selects `clientSecretEncrypted`. [6]
7. `findByIdWithEncryptedSecret(id)` is the only method that returns `clientSecretEncrypted`. It returns `null` for an unknown id.
8. `create`, `update` and `setEnabled` write only the fields they are given. `update` without a new secret leaves `clientSecretEncrypted` unchanged. Each returns the shape of criterion 6.
9. `countLinkedAccounts(id)` returns the number of distinct users with an `Account` row whose `provider` is `oidc-<id>`. [36]
10. `deleteWithAccounts(id)` deletes the provider and every `Account` row with `provider = "oidc-<id>"` in one transaction. If either delete fails, neither happens. Deleting an unknown id throws `ErrorWithCode` not-found and deletes nothing. [37]
11. `getOidcProviderRepository()` returns the repository from the DI container, built with `bindModuleToClassOnToken` like `packages/features/credentials/di/CredentialRepository.module.ts`.
12. Every query uses `select`, never `include`. No method returns a Prisma type; the DTOs live in `packages/lib/dto/`.
13. `yarn type-check:ci --force` passes. Code that switches over `IdentityProvider` handles `OIDC` (for example the provider name on `/auth/error`, `apps/web/app/(use-page-wrapper)/auth/error/page.tsx:39-48`, falls back to "your original login method").
14. Unit tests with a mocked Prisma client cover criteria 3 and 5 to 10, including a check that the `select` of `findEnabled` and `list` has no `clientSecretEncrypted` key.

### Out of scope

- Encrypting or decrypting the secret, field validation, the 10-provider limit and the discovery test (sub-issue 3).
- Admin UI (sub-issue 4) and the login flow (sub-issue 5).
- Mapping `oidc-<id>` to `IdentityProvider.OIDC` in `identityProviders.ts` (sub-issue 5).
- Any change to `User` or `Account` columns. The user link is an `Account` row (ADR-002).

### Design decisions

**Where the provider order comes from.** Store an integer `position`, sorted with `createdAt` as the tie-breaker.

1. Sort by `createdAt` only. Rejected: the admin cannot put the main provider first (design criterion 11 asks for an admin-set order).
2. A linked list (`previousId`). Rejected: reordering needs several row updates and is easy to corrupt; 10 rows at most do not need it.

**How `allowedDomains` is stored.** A Postgres text array on the provider row.

1. A separate `OidcProviderDomain` table. Rejected: a second table and a join for at most a handful of strings that are always read with the provider.
2. One comma-separated text column. Rejected: the code must split and trim it everywhere, and a domain with a stray space would not match.

**How a user is linked to a provider.** Use the existing `Account` table with `provider = "oidc-<id>"`, not a new column on `User`. See ADR-002 in `specs/oidc-sign-in/decisions.md`: `Account` already has `@@unique([provider, providerAccountId])` (`schema.prisma:1258`), and a column on `User` would allow only one link per user.

**Who records the last editor.** `updatedById` is a plain nullable integer, not a relation to `User`.

1. A relation to `User`. Rejected: it changes the `User` model, which every Cal.diy query touches, for an audit field nobody joins on.
2. No editor field. Rejected: when two admins edit one provider (design criterion 8), the page cannot say who saved last.

### Technical notes

- Repository pattern: `packages/features/selectedSlots/repositories/PrismaSelectedSlotRepository.ts` (constructor takes `PrismaClient`).
- DI pattern: `packages/features/credentials/di/CredentialRepository.module.ts`; tokens in a new `packages/features/auth/oidc/di/tokens.ts`, spread into `packages/features/di/tokens.ts`.
- Migration folder name: `<timestamp>_add_oidc_provider` in `packages/prisma/migrations/`, after `20261029130000_add_waitlist_entry_slot_start`.
- Run `yarn prisma generate` after the schema change.
- Likely files: `schema.prisma`, the migration, `PrismaOidcProviderRepository.ts` and its test, `packages/lib/dto/OidcProviderDto.ts`, `OidcProviderRepository.module.ts`, `OidcProviderRepository.container.ts`, `tokens.ts` (two files), and `auth/error/page.tsx` if criterion 13 needs it.

### Mutation testing

The repository methods are short and have clear branches (unknown id, unchanged secret, transaction rollback), so StrykerJS can run on `PrismaOidcProviderRepository.ts` with only its own test file.
