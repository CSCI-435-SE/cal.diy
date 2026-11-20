# Local Keycloak for OIDC sign-in

A real OIDC provider for testing the OIDC sign-in feature (#131) on your machine. It runs from its own compose file, so the shared `docker-compose.yml` is unchanged and teammates who don't work on OIDC run nothing new. Numbers in brackets, such as [15], are criteria in [`../design.md`](../design.md).

> **Test-only values.** The client secret, user passwords and admin login below are public, committed to this repo, and only for a Keycloak on `localhost`. Never use them, or this realm file, on a real deployment.

## Requirements

Docker with Compose v2 (`docker compose version`). Port `8180` must be free.

## Start

From the repo root:

```bash
docker compose -f specs/oidc-sign-in/test-idp/docker-compose.yml up -d
```

The first start pulls the image (about 500 MB) and imports `realm-cal-diy.json`. Keycloak takes 20–60 seconds to come up.

## Check that it is up

```bash
curl -s http://localhost:8180/realms/cal-diy/.well-known/openid-configuration
```

This returns JSON with `"issuer":"http://localhost:8180/realms/cal-diy"` and an `authorization_endpoint`, `token_endpoint` and `jwks_uri`. If curl fails to connect, wait a few seconds and retry, or read the logs with `docker compose -f specs/oidc-sign-in/test-idp/docker-compose.yml logs -f`.

To see the login page for the `cal-diy` client, open [this link](http://localhost:8180/realms/cal-diy/protocol/openid-connect/auth?client_id=cal-diy&response_type=code&scope=openid&redirect_uri=http://localhost:3000/api/auth/callback/oidc-test&code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM&code_challenge_method=S256). After a sign-in, Keycloak sends the browser to `localhost:3000`, which fails if Cal.diy isn't running. That is expected.

Admin console: <http://localhost:8180/admin>, user `admin`, password `admin`. Pick the `cal-diy` realm at the top left.

## Values for the Cal.diy admin page

At **Settings → Admin → Identity providers** [3], add a provider with:

| Field | Value |
|---|---|
| Display name | `Keycloak` |
| Issuer URL | `http://localhost:8180/realms/cal-diy` |
| Client ID | `cal-diy` |
| Client secret | `cal-diy-local-test-secret` |
| Scopes | `openid email profile` |
| Allow new accounts | On (needed for the `verified` user to get a new account [14]) |
| Allowed email domains | Empty, or `example.com` |

Cal.diy's callback for a provider is `http://localhost:3000/api/auth/callback/oidc-<provider id>`. The client accepts `http://localhost:3000/api/auth/callback/*`, so any provider id works. The client requires PKCE with `S256` [13] and has the implicit flow and direct access grants (password grant) turned off.

## Test users

Every user's password is `test-password`. Sign in with the username.

| Username | Email | `email_verified` | Name | Tests |
|---|---|---|---|---|
| `verified` | `verified@example.com` | `true` | Vera Verified | A first login creates a new account [14]; the demo |
| `unverified` | `unverified@example.com` | `false` | Una Unverified | Rejected with `unverified-email` [15] |
| `noemail` | none | `false` | Nora Noemail | No `email` claim; rejected with `missing-email` [16] |

Keycloak sends `email_verified: false` for a user with no email, so the `noemail` token also looks unverified. The login flow has to check for a missing `email` before it checks `email_verified`, or this user gets `unverified-email` instead of `missing-email`.

## Stop and reset

```bash
docker compose -f specs/oidc-sign-in/test-idp/docker-compose.yml down
```

This removes the container and everything in it. The next start imports the realm again, so you begin from the same clean realm, users and client. Changes made in the admin console are lost. To pause and keep them, use `stop` and `start` in place of `down` and `up -d`.

## Changing the realm

Edit `realm-cal-diy.json`, then run `down` and `up -d`. Keycloak imports the file only into an empty database. The `components` block makes email optional in the user profile. Without it, Keycloak stops the `noemail` user at an "update your account" page and asks for an email.
