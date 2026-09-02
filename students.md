# Cal.diy — Student Setup Guide (Windows-friendly)

How to get this project running locally, tested with seed data, with unit + E2E tests — the exact path verified on Windows 11 (2026-07-16).

For anything not covered here (integrations, Docker deployment, env-var reference), see the [main README](./README.md).

## What you need

| Tool | Version we verified | Notes |
|---|---|---|
| Node.js | v24.x (repo requires >= 18) | |
| Yarn | 4.12.0 via Corepack | `yarn --version` inside the repo must say 4.12.0 |
| Docker Desktop | any recent | **Only needed for PostgreSQL + Mailhog.** The app itself runs natively. No local Postgres install required. |
| Git Bash | ships with Git for Windows | Run the setup commands below in Git Bash, not PowerShell |

Clone under a path with **no spaces or apostrophes** (e.g. `C:\dev\...`) — shell scripts in this monorepo break otherwise.

> 💡 **New to Next.js?** Cal.diy's frontend and API routes are built with [Next.js 14](https://nextjs.org/docs). The [Next.js Getting Started tutorial](https://nextjs.org/learn) covers the App Router, server components, and API routes — the three things you'll encounter most.

> 💡 **New to Prisma?** The database schema lives in `packages/prisma/schema.prisma`, and all queries go through the [Prisma Client](https://www.prisma.io/docs/getting-started). The [Prisma quickstart](https://www.prisma.io/docs/getting-started/quickstart-sqlite) explains the schema → migration → query workflow.

> 📖 **Architecture overview:** [docs.cal.com](https://docs.cal.com) has developer guides covering the monorepo layout, booking flows, and API design. Read the *Contributing* section before picking a task.

## Setup (first time)

```bash
# 1. Clone (Windows: symlinks flag matters) and install
git clone -c core.symlinks=true https://github.com/CSCI-435-SE/cal.diy.git
cd cal.diy
yarn

# 2. Environment file
cp .env.example .env
```

Edit `.env` and set these two (generate values with the commands shown):

```bash
openssl rand -base64 32   # -> NEXTAUTH_SECRET
openssl rand -base64 24   # -> CALENDSO_ENCRYPTION_KEY
```

```bash
# 3. WINDOWS FIX — packages/prisma/.env is a broken symlink on most Windows clones
#    (it will be a tiny text file containing "../../.env"). Replace it with a real copy:
rm packages/prisma/.env && cp .env packages/prisma/.env
#    Re-do this copy whenever you change the root .env.

# 4. Database (Docker): starts Postgres 18 on port 5450, migrates, seeds
yarn workspace @calcom/prisma db-up
yarn workspace @calcom/prisma db-deploy
yarn workspace @calcom/prisma db-seed

# 5. Mailhog (emails during dev/E2E) — http://localhost:8025
cd packages/emails && docker compose up -d && cd ../..

# 6. Run the app
yarn dev
```

App: **http://localhost:3000** — seeded logins:

| Email | Password |
|---|---|
| `pro@example.com` | `pro` |
| `free@example.com` | `free` |
| `admin@example.com` | `ADMINadmin2022!` |

Browse the database with `yarn db-studio` (Prisma Studio, port 5555).

## Running tests

### Unit tests (Vitest, ~2 min)

```bash
NEXT_PUBLIC_IS_E2E="" TZ=UTC yarn test
```

**Why the `NEXT_PUBLIC_IS_E2E=""` prefix:** if your `.env` has `NEXT_PUBLIC_IS_E2E=1` (needed for E2E), 7 unit tests fail by design — E2E mode intentionally bypasses SSRF localhost-blocking and forces feature rollouts to 100%. Blank it for unit runs.

**Verified Windows baseline (2026-07-16): 4049 passed, 58 skipped.** Two files fail on Windows only (`\` path separators — they pass on Linux/CI): `apps/web/test/lib/next-config.test.ts` and `apps/web/test/lib/pagesAndRewritePaths.test.ts`. Safe to ignore.

### E2E tests (Playwright)

One-time: `npx playwright install` (downloads browsers) and set in `.env`: `NEXT_PUBLIC_IS_E2E=1`, `E2E_TEST_MAILHOG_ENABLED=1`.

Two Windows realities to work around:

1. **Don't run the full suite against `yarn dev`** — the dev-mode server hangs under parallel test load (verified: 120s navigation timeouts, then total unresponsiveness). Use a production build.
2. **Playwright can't auto-start the server on Windows** — the `webServer` command in `playwright.config.ts` uses Unix inline-env syntax (`NEXT_PUBLIC_IS_E2E=1 yarn ...`) that cmd.exe can't parse (`Process from config.webServer was not able to start`). Start the server yourself in Git Bash; Playwright then reuses it (`reuseExistingServer` is on locally).

```bash
# Terminal 1 — build once, then serve the production app (stop yarn dev first)
export NODE_OPTIONS="--max-old-space-size=16384"
yarn build          # if it fails once on sprite.svg/Biome, just run it again (see gotchas)
yarn workspace @calcom/web copy-app-store-static
NEXT_PUBLIC_IS_E2E=1 yarn workspace @calcom/web start -p 3000

# Terminal 2 — re-seed and run the suite (headless, throttled workers)
yarn workspace @calcom/prisma db-seed
PLAYWRIGHT_HEADLESS=1 NEXT_PUBLIC_IS_E2E=1 yarn playwright test --project=@calcom/web --workers=4
```

**Verified Windows baseline (2026-07-16): 243 passed, 3 failed, 27 skipped in ~6 min** (273 total). Known failures:
- `icons.e2e.ts` — no `win32` screenshot baseline exists in the repo (Linux-only snapshots); environment artifact, not a bug.
- 2 `booking-seats.e2e.ts` reschedule tests — timeouts/element-not-found; rerun individually before treating as real regressions.

While developing, run a single spec instead of the whole suite:
`PLAYWRIGHT_HEADLESS=1 yarn e2e apps/web/playwright/login.e2e.ts`

## Gotchas we actually hit (in order)

1. **Port conflicts** — cal.diy needs 3000 (app), 5450 (Postgres), 8025/1025 (Mailhog). Check with `netstat -ano | findstr "3000 5450 8025"` and stop whatever holds them (for us it was another project's Docker container: `docker stop <name>`).
2. **`packages/prisma/.env` broken symlink** — every Prisma command fails with `unexpected character / in variable name` until you replace it with a real copy (step 3 above).
3. **`yarn build` fails once with a Biome error on `sprite.svg`** (`No files were processed in the specified paths`) — a CRLF/LF line-ending artifact of the Windows checkout. The failing step already rewrote the file, so **just run `yarn build` again**; it passes on the second run.
4. **Build memory** — export `NODE_OPTIONS="--max-old-space-size=16384"` (or 8192 on 16 GB machines) before `yarn build`/`yarn dev`.
5. **`NEXT_PUBLIC_IS_E2E=1` breaks unit tests** — see the unit-test section above.
6. **Playwright webServer fails to start on Windows** — see the E2E section above.

## Daily workflow (after first-time setup)

```bash
yarn workspace @calcom/prisma db-up   # if the Postgres container isn't running
yarn dev                              # http://localhost:3000
```

Reset the database to a clean seeded state anytime: `yarn workspace @calcom/prisma db-reset` (nukes the Docker volume, re-migrates, re-seeds).

## Contributing workflow

All team members have write access to this repository, so the team uses a **branch-based** workflow — not forks. Here is the background and the commands.

**Why not forks?** Forking is the standard model for contributing to open-source projects where you _don't_ have write access: you fork to your own GitHub account, clone your fork, and open a PR from your fork back to the original. You will encounter this when contributing to the upstream project. But for your course team — where everyone has write access to the shared repo — it just adds confusion: two clones on your machine, two remotes to keep in sync, merge conflicts that are harder to reason about.

**Branch-based workflow** is what most professional teams use internally. You clone the shared repo once, create a short-lived branch for each issue, push the branch back to the same repo, and open a PR from that branch into `main`. One clone, one remote, full PR workflow.

### For each issue you work on

```bash
# One-time setup: clone the team repo (skip if already done)
git clone https://github.com/CSCI-435-SE/cal.diy.git
cd cal.diy

# Before starting each issue: make sure you are on a fresh main
git checkout main
git pull origin main

# Create a branch named for the issue
git checkout -b feat/issue-17-dark-mode      # new feature
git checkout -b fix/issue-42-toast-dismiss   # bug fix

# ... make your changes, run tests ...

# Stage and commit
git add <the files you changed>
git commit -m "feat: add dark mode toggle (#17)"

# Push the branch to the team repo
git push origin feat/issue-17-dark-mode
```

After pushing, GitHub shows a **"Compare & pull request"** banner on the repository page. Click it to open a PR from your branch into `main`. Fill in the description (what changed and why), reference the issue (`Closes #17`), and request a review from a teammate.

**Branch naming:**

| Prefix | Use for |
|---|---|
| `feat/issue-<N>-short-description` | new features |
| `fix/issue-<N>-short-description` | bug fixes |
| `chore/short-description` | docs, config, dependency updates |

> ⚠️ **`main` is protected — direct pushes are blocked.** All changes go through a reviewed PR. If you accidentally commit to `main` locally, move your changes to a branch before pushing:
>
> ```bash
> git checkout -b fix/issue-42-my-fix   # create branch from your current state
> git checkout main
> git reset --hard origin/main          # revert local main to match remote
> ```

**After your PR is merged**, delete the branch to keep the repo tidy:

```bash
git checkout main
git pull origin main
git branch -d feat/issue-17-dark-mode
```

## Project documentation & policies (required reading)

📚 **Official documentation:** <https://docs.cal.com> — concepts, API reference, and self-hosting guides.

Cal.diy has its own established contribution processes. They are **not restated here** — you are
responsible for finding, reading, and following them from the sources below:

| You must take care of | Where to find it |
| --- | --- |
| How to use the tool | <https://docs.cal.com> |
| Code review process | [CONTRIBUTING.md — House Rules](CONTRIBUTING.md) |
| Bug / issue resolution process | [CONTRIBUTING.md — Issues](CONTRIBUTING.md) |
| Pull request conventions & PR policies | [CONTRIBUTING.md](CONTRIBUTING.md) (PR size: < 500 lines, < 10 files) |
| AI policies | [AGENTS.md](AGENTS.md) · [CLAUDE.md](CLAUDE.md) |
