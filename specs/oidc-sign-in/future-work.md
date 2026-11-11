# OIDC Sign-In Future Work

Ideas and enhancements deferred from the initial implementation.

## Enhancements

- Map provider groups or claims to Cal.diy roles and teams (customer Q9).
- Single logout at the provider (out of scope in #131).
- Per-provider button icon and color.
- API v2 endpoints for provider management.
- Show the last sign-in error and time for each provider on the admin page.

## Technical Debt

- If the per-request provider query shows in profiles, add a cache behind the repository with cross-instance invalidation (ADR-001, option 2).
- The secret uses AES-256-CBC without authentication, like other stored credentials. Moving all of them to an authenticated mode is a separate change.

## Nice to Have

- A mock OIDC server for CI, if Keycloak is too heavy for CI runs (ADR-008, option 3).
