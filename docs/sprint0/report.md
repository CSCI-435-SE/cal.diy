# Sprint 0 Report — Cal.diy

> ## ⚠️ UNCLAIMED DRAFT — read this before using it
>
> D6 is **one report per team** (Sprint 0 spec, §D6: "Each team submits one sprint report").
> This draft was written **2026-09-15** by Zachary Short and has **not** been coordinated on
> Zulip. If another member has already started `docs/sprint0/report.md`, **theirs is the
> report** — take whatever is useful from here and delete this file rather than opening a
> competing version.
>
> Repository evidence that no other version existed when this was written:
> `git log --all --oneline -- docs/sprint0/report.md` returned nothing, and
> `gh pr list --repo CSCI-435-SE/cal.diy --state all` returned only #7 and #8
> (both run 2026-09-15). Zulip was not checked — no agent access.
>
> **Markers used below**
> - **`[TEAM INPUT NEEDED]`** — a fact only a teammate can supply. Do not guess it.
> - **`[UNVERIFIED]`** — asserted here but not backed by a dated measurement in this repo.
>   Every one is also listed in the appendix.
> - **`[DRAFT — author to correct]`** — prose drafted from measured notes for the named author
>   to rewrite in their own words. Sprint 0 §D5 requires each member to be able to explain
>   everything submitted under their name; these sections are not yet in anyone's voice.

---

## 1. Team

**Team name:** `[TEAM INPUT NEEDED]` — the spec asks the team to choose a name ("choose a cool
name!"). "Cal.diy" below is the *project* name, not a chosen team name.

**Project:** Cal.diy — the community-driven, fully open-source scheduling platform; a fork of
Cal.com with all enterprise/commercial code removed (`README.md:41`).

**Repository:** <https://github.com/CSCI-435-SE/cal.diy>

| Member | GitHub username | Evidence for the mapping |
|---|---|---|
| Zachary Short | `zach-short` | confirmed via `gh api user` (2026-09-14) |
| Zachary Bowden | `zachbowden` | author of PR #7 and #8 (`gh pr view`). Commits are authored as `lexzach <github@zachbowden.com>` (`git log origin/docs/standards-guidelines`), so the git name and the GitHub account differ |
| Joshua Ko | `kojoshuay` | author of issues #9 and #10 (`gh issue list`) — **[UNVERIFIED]** name↔account mapping inferred from the roster, not confirmed by him |
| Julissa Hernandez | `julissaehp` | author of issues #15–#18 — **[UNVERIFIED]**, same caveat |
| Demir Batu Beynam | `[TEAM INPUT NEEDED]` | no issues, PRs or commits found under any account matching this name |
| Dylan Han | `[TEAM INPUT NEEDED]` | no issues, PRs or commits found under any account matching this name |

Roster source: the instructor's Sprint 0 announcement, captured verbatim in
`ai-logs/sprint0/zach-short/2026-09-14_claude-code_create-a-new-branch.md:9594`.

> **Open question for the team.** Issues #1 and #2 were opened by `musta55`, who is not on this
> team's roster. `Musta55 <mustahidhasansakib@gmail.com>` also appears as an upstream commit
> author in `git log origin/main`. The Sprint 0 spec says "see the issues the instructor/TA will
> create for Sprint 0 as reference", so these are **probably** TA-seeded reference issues —
> **[UNVERIFIED]**. PR #8 implements #1, which only satisfies D5's "an issue someone else wrote"
> rule if #1 is genuinely not the PR author's own.

---

## 2. Project overview

### 2.1 D1 evidence

| Evidence | File | Committed in |
|---|---|---|
| App running — login page | `docs/sprint0/screenshots/app-login.png` | `e6f92f31c5` |
| App running — booking page | `docs/sprint0/screenshots/app-booking-page.png` | `e6f92f31c5` |
| App running — booking slots | `docs/sprint0/screenshots/app-booking-slots.png` | `e6f92f31c5` |
| Test suite passing | `docs/sprint0/screenshots/tests-passing.png` | `e6f92f31c5` |

**These are Zachary Short's only.** D1 says *every* team member must run the project locally, so
each member's own screenshots belong here too — `[TEAM INPUT NEEDED]`.

**Measured baseline on macOS, 2026-09-15, Node 22.14.0** (every number below was produced by
running the command named, with `--force` where turbo caches):

| Gate | Command | Result |
|---|---|---|
| Install | `yarn` | exit 0, 1m12s, 3.4 GB of `node_modules` |
| Prisma types | `yarn prisma generate` | exit 0 |
| Migrations | `yarn workspace @calcom/prisma db-migrate` | exit 0, 14s, **105 tables** |
| Seed | `yarn db-seed` | **41 users, 151 event types** (logins `free:free`, `pro:pro`) |
| Types | `yarn type-check:ci --force` | exit 0 — 9 turbo tasks, 0 cached |
| Lint | `yarn lint --force` | exit 0 — **3970 files**, 6091 warnings / 13144 infos / **0 errors** |
| Unit tests | `TZ=UTC yarn test --exclude '**/.claude/**'` | exit 0 — **407 files, 4119 tests** (4069 passed, 47 skipped, 3 todo) |
| Unit tests, timezone project | `VITEST_MODE=timezone yarn test --exclude '**/.claude/**'` | exit 0 — 4 files, 64 tests |
| Build | `SKIP_DB_MIGRATIONS=1 yarn build` | exit 0 — 13 turbo tasks, 2m46s |
| Dev server | `yarn dev` | `✓ Ready in 451ms`; `/auth/login`, `/pro`, `/pro/30min` all return 200 |

`students.md:81` records the documented Windows baseline as **4049 passed / 58 skipped**
(2026-07-16). The macOS numbers above are **4069 passed / 47 skipped**; the drift is consistent
with three months of upstream commits, and the two Windows-only failures `students.md` calls out
do not occur here.

**Three environment findings that contradict the repo's own setup docs**, each measured rather
than assumed:

1. **Node 26 does not work; Node 22.14.0 does.** On Node 26.7.0 (this machine's default)
   `yarn prisma generate` exits 1 — the zod generator calls `fs.rmdir(..., {recursive: true})`,
   an option removed in modern Node. Prisma Client, the Kysely types and the enum generator all
   succeed; only the zod step fails, and it takes the command's exit code with it. `students.md`
   says Node v24.x; `package.json`'s `engines` pins only npm and yarn, never Node.
2. **`yarn build` writes to your database.** `packages/prisma`'s build script runs
   `yarn prisma migrate deploy` against `DATABASE_URL` (`auto-migrations.ts:34`).
   `CONTRIBUTING.md` §Building tells every contributor to run `yarn build` before pushing and
   never mentions this. Its intended "skip when no database" guard is broken —
   `is-prisma-available-check.ts` returns `false` only for
   `Prisma.PrismaClientInitializationError` and rethrows everything else, so a refused connection
   escapes the guard and the build exits 1 in 20s looking like a code bug. Escape hatch:
   `SKIP_DB_MIGRATIONS=1` (`auto-migrations.ts:17`). Filed as issue #12.
3. **`yarn lint` replays a turbo cache.** A run on 2026-09-14 printed
   `Cached: 11 cached, 11 total >>> FULL TURBO` having checked zero files. `AGENTS.md` prescribes
   `--force` for `type-check:ci` and says nothing about lint, which makes lint the easier of the
   two to be fooled by. Use `yarn lint --force` when the number matters.

**Local deviation from `students.md`:** Docker is not installed on this machine, so PostgreSQL
runs as a native Homebrew service (postgresql@14, 14.18, port 5432) rather than in the documented
compose stack, and `.env` points at `postgresql://…@localhost:5432/calendso` instead of the
`.env.example` default port 5450. Mailhog — the other half of that compose file — is therefore
not running, so anything that sends mail locally has nowhere to deliver.

### 2.2 Written answers to the D1 questions

> `[DRAFT — author to correct]` **Everything in §2.2 is drafted from measured notes for Zachary
> Short to rewrite in his own words.** Sprint 0 §D5 warns that you must be able to explain
> anything submitted under your name; nothing here should be handed in unread.

**What does the system do? Who are its users? What are its main features?**

Cal.diy is a self-hosted scheduling platform: it replaces the email thread where two people try
to agree on a time. An owner publishes a public booking page under a username (`/pro`), defines
one or more *event types* on it (`/pro/30min` — a name, a duration, a location), and connects
their real calendars; the app subtracts their existing commitments from their declared
availability and shows a visitor only the slots that are genuinely free, converted into the
visitor's own timezone. The visitor picks one, and the app writes the booking to both sides'
calendars, creates a video-conference link if the event type calls for one, and sends the
confirmation and reminder emails.

Its users come in two roles. *Owners* — individuals and self-hosters — configure availability,
event types and integrations. *Bookers* never sign in; they only see the public booking page.
The README is explicit that this is a self-hosted project with no hosted or managed version, and
recommends Cal.com rather than Cal.diy for commercial or production use (`README.md:2`, `:5`, `:52`).

Main features, as they exist in *this* fork: booking pages and event types; availability
schedules with date overrides; timezone handling; two-way calendar sync and conferencing through
the app store; payments; webhooks and an embeddable booker; and a REST API. What is **not** here
matters as much: this fork has "all enterprise/commercial code removed" — Teams, Organizations,
Insights, Workflows and SSO/SAML are gone (`README.md:47`). That is not just a documentation
claim; `packages/features/ee/` does not exist (`ls packages/features/ee` → No such file or
directory), and the workflow tables were dropped deliberately in
`packages/prisma/migrations/20260319000000_drop_workflow_tables/migration.sql` (commit
`ab21c7f805`, "refactor: Cal.diy (#28903)"). Three paths that `AGENTS.md` and `agents/rules/**`
hand to contributors — `packages/features/ee/workflows/lib/constants.ts`,
`packages/features/calendar-cache-sql`, and
`packages/features/ee/billing/service/proration/tasker/` — are casualties of that removal and no
longer exist.

**What are the main components and how do they interact?**

Five, in a deliberately acyclic stack:

- **`apps/web`** — the Next.js application (16.2.3, `apps/web/package.json`), serving both the
  authenticated dashboard and the public booking pages. Partly App Router, partly Pages Router.
- **`apps/api/v2`** — a separate NestJS service (`@nestjs/common` 10.4.20,
  `apps/api/v2/package.json`) exposing the public REST API, with `apps/api/index.js` fronting v1.
- **`packages/trpc`** — the type-safe RPC layer the web app talks to. Routers live in
  `packages/trpc/server/routers/` (`viewer`, `loggedInViewer`, `publicViewer`, `features`).
- **`packages/features`** — 61 domain slices (`ls -d packages/features/*/ | wc -l` → 61):
  `bookings`, `availability`, `calendars`, `credentials`, `auth`, and so on. Each holds its own
  repositories, services and components.
- **`packages/prisma`** — the schema and 595 migrations; the only package that is supposed to
  know the database exists.

Flow of a booking: the browser calls a tRPC procedure or a REST endpoint → the router calls a
service in the relevant `packages/features` slice → the service calls a Repository class →
the repository is the only layer that touches Prisma → Postgres. Calendar and video providers
are reached through `packages/app-store`, which is 152 directories of integrations
(`ls packages/app-store | wc -l`), one per provider, with a CLI (`packages/app-store-cli`) that
generates the wiring files.

The layering is enforced, not merely suggested: `packages/lib` → `packages/app-store` →
`packages/features` → `packages/trpc` → `apps/web`, never upward, with the specific forbidden
imports enumerated in `agents/rules/architecture-circular-dependencies.md`. Two further rules
shape almost every file: all database access goes through Repository classes and no business
logic goes in them (`agents/rules/data-repository-pattern.md`), and DTOs are required at every
architectural boundary so Prisma types never reach React
(`agents/rules/data-dto-boundaries.md`).

**What are the major technologies, frameworks, and external services?**

Measured from this checkout rather than from the docs, because the docs are stale on exactly this
point — `students.md` says "Next.js 14" and `AGENTS.md` §Tech Stack says "Next.js 13+", and both
are wrong:

| Layer | Technology | Version | Source |
|---|---|---|---|
| Web framework | Next.js | **16.2.3** | `apps/web/package.json` |
| API framework | NestJS | 10.4.20 | `apps/api/v2/package.json` |
| Language | TypeScript, strict | — | `AGENTS.md` §Tech Stack |
| Database | PostgreSQL | ≥13 required; 14.18 used here | `README.md:74`; local install |
| ORM | Prisma | 6.16.1 | `packages/prisma/package.json` |
| RPC | tRPC | 11.0.0-next-beta.222 | `packages/trpc/package.json` |
| Auth | NextAuth | 4.24.13 | `apps/web/package.json` |
| Styling | Tailwind CSS | — | `README.md:59` |
| Monorepo | Turborepo | 2.7.1 | `package.json` |
| Package manager | Yarn | **4.12.0**, vendored at `.yarn/releases/` | `package.json` `packageManager` |
| Lint/format | Biome | schema 2.3.10 | `biome.json:2` |
| Tests | Vitest (unit), Playwright (e2e) | — | `vitest.workspace.ts`, `playwright.config.ts` |

External services are reached through the app store rather than hard-wired: Google Calendar,
Office 365 / Outlook, Zoom, Google Meet, Stripe and Daily.co all have their own directories under
`packages/app-store/` (`ls packages/app-store | grep -iE "google|zoom|stripe|office365"`).
Daily.co is the default video provider called out in the README's Built With list
(`README.md:61`).

**How is the code organized?**

By domain, not by technical layer — "vertical slices"
(`agents/rules/architecture-vertical-slices.md`). A feature's services, repositories, DTOs,
components and tests all live together under `packages/features/<domain>/`, so a change is one
directory rather than four. The workspace globs are `apps/*`, `apps/api/*`, `packages/*`,
`packages/embeds/*`, `packages/features/*`, `packages/app-store`, `packages/app-store/*` and
`packages/platform/*` (`package.json` `workspaces`).

One split is worth knowing because it is easy to get wrong: `packages/features/**` must stay
framework-agnostic and **must not import `@calcom/trpc`**; React hooks that call tRPC live in
`apps/web/modules/**` instead (`agents/rules/architecture-features-modules.md`). And
`apps/api/v2` cannot import `@calcom/features` or `@calcom/trpc` directly — those must be
re-exported through `packages/platform/libraries` and imported as `@calcom/platform-libraries`,
because the v2 app's `tsconfig.json` carries no path mappings for them (`AGENTS.md` §API v2
Imports).

**How do developers contribute? What is the PR and code review workflow? What are the standards
for issue reporting, triage and management?**

`CONTRIBUTING.md` sets the house rules. Before opening anything, check for a duplicate
(§Prevent Work Duplication). **Feature** work waits for a core team member to remove the
`🚨 needs approval` label; **bugs, security, performance and documentation may start
immediately** (§Work Only on Approved Issues). PRs summarise themselves at the top, link their
issue with a GitHub keyword (`fixes #XXX`), state what was tested and how, and stay **under 500
changed lines and 10 code files** — with an explicit recipe for splitting when they do not
(§Keep PRs Small and Focused). `AGENTS.md` adds Conventional Commits, draft-by-default PRs, and
the code rules a reviewer will actually check: `select` never `include` in Prisma queries,
`credential.key` never returned from any query or endpoint, no `as any`, no barrel imports, and
all UI strings through `t()` into `packages/i18n/locales/en/common.json`.

Triage upstream is by priority label — Low / Medium / High / Urgent, keyed to how close the
issue is to the core booking path (`CONTRIBUTING.md` §Priorities).

CI is the part worth understanding before trusting a green check, because it is both
**label-gated and path-gated** (`.github/workflows/pr.yml`, verified 2026-09-14):

- A **Markdown- or docs-only PR runs no checks at all**, and the `required` check still passes.
- **Without the `ready-for-e2e` label**, the build, e2e, integration and setup-db jobs are all
  skipped — and `required` then fails *on purpose*, to stop a merge without e2e.
- **Without write access or a `run-ci` label**, a PR runs zero checks and `required` fails.
- `check-prisma-migrations` runs only when `schema.prisma` or `migrations/**` changed.

**In this fork, none of that applied to us**: see §8 — the team member writing this had `pull`
permission only for the whole sprint, so no CI run was ever triggered from his work.

---

## 3. Feature backlog summary

**16 issues open** in `CSCI-435-SE/cal.diy` as of 2026-09-15
(`gh issue list --repo CSCI-435-SE/cal.diy --state all --limit 100`). #7 and #8 are pull
requests, which is why the issue numbers skip them.

| Author | Issues | Count |
|---|---|---|
| `zachbowden` | #3, #4, #5, #6 | 4 ✅ |
| `zach-short` | #11, #12, #13, #14 | 4 ✅ |
| `julissaehp` | #15, #16, #17, #18 | 4 ✅ |
| `kojoshuay` | #9, #10 | 2 ⚠️ below the 4 minimum |
| `musta55` | #1, #2 | probably TA-seeded reference issues — **[UNVERIFIED]** |
| Demir Batu Beynam | — | `[TEAM INPUT NEEDED]` — **0 found** |
| Dylan Han | — | `[TEAM INPUT NEEDED]` — **0 found** |

**D2 requires at least 4 per member** (2 small/medium, 2 ambitious). On the repository evidence
above, three members are short. If those members filed issues under accounts this report has
failed to map to their names, the table is wrong and should be corrected rather than the issues
re-filed.

**Themes.** The backlog clusters into four:

1. **Event-type authoring ergonomics** — #1 title length, #2 description character counter,
   #4 duration in hours and minutes, #16 icon tooltips, #15 favouriting event types.
2. **Not losing work / not corrupting it** — #9 warn before leaving an edit page with unsaved
   changes, #10 save enabled with nothing changed, #12 `yarn build` silently migrating the
   database.
3. **Richer availability** — #6 time-of-day granularity for out-of-office, #17 per-location
   schedules, #18 recurring date overrides.
4. **Capabilities the fork removed or never had** — #3 forced 2FA, #5 event themes,
   #11 reschedule reasons, #13 a waitlist for full slots, #14 an Insights dashboard.

**Labels.** The Sprint 0 spec asks for `scope: small|medium|large|xl` and
`type: feature|improvement|bug`. **Those labels do not exist in this repository.**
`gh label list --repo CSCI-435-SE/cal.diy --limit 100` returns 12: `bug`, `documentation`,
`duplicate`, `enhancement`, `good first issue`, `help wanted`, `invalid`, `question`, `wontfix`,
`effort:low`, `effort:medium`, `effort:high`. The team has used `enhancement`/`bug` for type and
`effort:*` for scope. Creating the spec's labels needs write access, which at least one member
did not have (§8).

**Top features the team is most interested in pursuing:** `[TEAM INPUT NEEDED]` — the spec asks
for the team's top 3–5, and that is a decision the team makes together, not one this draft should
make for it. A starting proposal, to be argued with:

1. **#9 — warn before leaving an edit page with unsaved changes.** Pairs naturally with the #10
   fix already written; the same dirty-state machinery serves both.
2. **#17 — different availability schedules per event location.** The most genuinely ambitious
   item in the backlog and squarely in the product's core.
3. **#13 — waitlist for fully-booked slots.** A real capability gap with obvious user value.
4. **#11 — require a reason when a booking is rescheduled.** Small, well-bounded, touches the
   booking flow end to end, so it is a good vehicle for learning that path.
5. **#12 — `yarn build` migrating the database.** Not a feature, but it is a live footgun for
   every member of this team.

---

## 4. Standards document summary

The team's standards live at `docs/sprint0/standards.md`, authored by Zachary Bowden on branch
`docs/standards-guidelines` and **still open as PR #7, titled `WIP:`** — so as of 2026-09-15 it
is unmerged and, by its own rule ("prefixed with `WIP:` … should not be reviewed for merging"),
not yet binding.

**Conventions it adopts:** branch names `docs|feat|fix/<name>`; commit messages in present tense
describing the largest change (`Add …`, `Remove …`, `Fix …`); PR summary at the top with the same
prefix; issues linked from the PR description; `WIP:` prefix for PRs not ready for review; local
testing as the baseline expectation with tests required for new features; and an AI-use clause
stating that a contributor must **review every line** an AI generates and accepts full
responsibility for it, because "an AI agent cannot be held accountable".

**Deviations from the project's existing guidelines, and why.** The spec asks this section to
name them. Two are unintentional conflicts rather than deliberate deviations, and both were
raised as review comments on PR #7 (`gh pr view 7` shows two `COMMENTED` reviews by
`zach-short`):

1. **Commit message style.** `standards.md` prescribes `Add …` / `Fix …`. Both `AGENTS.md` and
   `CONTRIBUTING.md` require **Conventional Commits**, and the Sprint 0 spec's own worked example
   is `feat: add dark mode toggle (#17)`. The project's convention should win.
2. **The PR title prefix `doc:`.** The repo runs `amannn/action-semantic-pull-request@v5` with no
   `types:` override, so it accepts the conventional defaults — which include `docs:` but **not**
   `doc:`. A PR titled `doc: …` fails that check.

**The `# Definition of Done` heading is present with no content under it.** D3 is graded partly
on a "coherent DoD", so this is the gap most worth closing before the deadline. A drafted
replacement — grounded in what the repo actually enforces, including the two CI traps above — is
ready at `docs/agent/proposed-definition-of-done.md` and should be offered to the author as a
review suggestion on PR #7 rather than pushed to his branch.

---

## 5. Completed PRs

| PR | Issue | Author | Reviewer(s) | Status | Change |
|---|---|---|---|---|---|
| [#7](https://github.com/CSCI-435-SE/cal.diy/pull/7) — `WIP: docs: Add standards and guidelines doc` | — (D3) | `zachbowden` | `zach-short` (2 review comments) | **Open, WIP** | Adds `docs/sprint0/standards.md`: branch/commit conventions, PR process, testing expectations, AI-use policy, and an empty Definition of Done |
| [#8](https://github.com/CSCI-435-SE/cal.diy/pull/8) — `WIP: feat: Event title char limit` | #1 | `zachbowden` | none yet | **Open, WIP** | Modifies `packages/features/eventtypes/components/CreateEventTypeForm.tsx` and `packages/lib/constants.ts` |
| *(not opened)* — `fix: stop the description editor marking an untouched event type as changed` | **#10** | `zach-short` | — | **Blocked — cannot push** | Branch `fix/issue-10-save-button-no-changes` @ `c7a24ff217`, committed locally. 2 files changed (+7/−2), 2 new files, 7 new unit tests |
| *(not opened)* — `feat: set event duration in hours and minutes` | **#4** | `zach-short` | — | **Blocked — cannot push** | Branch `feat/issue-4-duration-hours-minutes` @ `f8d637d40c`, committed locally. 6 files, ~454 lines of which 220 are tests; 50 new unit tests |

**Nothing is merged.** D5's requirement is exactly two PRs per member on issues someone else
wrote; the two rows above marked *blocked* are complete and gated and have never reached GitHub,
for the reason in §8. Their full PR bodies are drafted at
`docs/agent/sprint0-d5-pr-draft-issue-10.md` and `docs/agent/sprint0-d5-pr-draft-issue-4.md`.

**Other members' PRs:** `[TEAM INPUT NEEDED]` — only #7 and #8 exist on the repository.

### What the two blocked PRs actually do

**#10 — "User can save event without changing anything"** (reported by `kojoshuay`). The Save
button was innocent. `EventTypeLayout.tsx:279` has always carried
`disabled={!formMethods.formState.isDirty}`; the form was genuinely dirty on load. The Lexical
description editor calls `setText` twice while mounting — two emissions ~48ms apart, measured on
the running app — echoing back the value it had just been seeded with, and `EventSetupTab.tsx:157`
wrote that echo into the form with `{ shouldDirty: true }`. Read out of React's fiber tree:
`dirtyFields: { description: true }`, `defaultValues.description = undefined`, live value `""`.

The part the issue did not mention is worse. The `md.render` → `turndown` round-trip is lossy, so
the echo often *differs* from what is stored, and `handleSubmit` builds its payload from
`dirtyValues` (`useEventTypeForm.ts:320`, `:410`). Proven live on event type 12: with
`description = '**bold** and _italic_'`, the form loaded holding `****bold**** and _italic_`, so
saving an event type nobody had edited persisted the mangled text. The fix is a small guard that
distinguishes the editor echoing its own seed value from the user typing, plus changing
`description: … ?? undefined` to `?? ""` so emptying a never-described event type returns the form
to genuinely clean.

**#4 — "Ability to set duration in hours and minutes"** (reported by `zachbowden`). The duration
entry existed as **two independently written `TextField`s** — one in the **+ New event type**
dialog (`CreateEventTypeForm.tsx:130-152`), one in the **editor setup tab**
(`EventSetupTab.tsx:309-335`) — not one shared control. The change adds a pure, tested
`minutes ⇔ {hours, minutes}` helper and one shared `DurationInput` component in
`packages/features/eventtypes`, and both surfaces now use it. No API or schema change was needed:
both still register a single `length` in minutes, so the v1/v2 wire format is untouched and
`agents/rules/api-no-breaking-changes.md` is satisfied without a version bump.

One design decision went **against** the issue author's suggestion, deliberately. He asked for
the hours box to appear only at 60 minutes or more; that was rejected because a hidden box is
undiscoverable (you would have to already know to type `120`) and a threshold rewrites the
focused field the instant it crosses 60. Shipped instead as both boxes always visible, with the
hours box blank behind a `0` placeholder — which meets the author's actual concern about visual
noise without the relayout. **This is exactly the kind of thing that needs the author's agreement
in review, and it has not had it yet.**

---

## 6. AI tool usage

### Zachary Short (`zach-short`)

**Tool:** Claude Code (CLI/desktop), model **Claude Opus 5**. Logs captured with **SpecStory
v2.10.0** and committed to
[`ai-logs/sprint0/zach-short/`](../../ai-logs/sprint0/zach-short/).

| Session (log file) | What it covered |
|---|---|
| `2026-09-14_claude-code_create-a-new-branch.md` | Environment setup, gate baselines, `yarn build` investigation, D1 |
| `2026-09-14_claude-code_write-the-d2-issues.md` | Grounding and drafting the D2 issues (#11–#14) |
| `2026-09-14_claude-code_fix-issue-10-save-button.md` | Diagnosing and fixing issue #10 |
| `2026-09-15_claude-code_implement-issue-4-duration.md` | Implementing issue #4 |
| `2026-09-15_claude-code_issue-10-screenshots-and-d6-report.md` | Before/after evidence for #10, and this report |

**Session counts.** `ai-logs/sprint0/zach-short/statistics.json` records three sessions with
per-session message counts (4 / 15 / 29 user messages; 286 / 379 / 262 agent messages), but there
are **five** transcripts — SpecStory only writes a statistics entry for sessions it tracked live,
and two of the five were recovered after the fact. So **5 transcripts, 3 with tracked statistics**
is the defensible statement; a single "total sessions" figure is **[UNVERIFIED]**.

**Types of task.** Environment archaeology and measurement (which Node version works, what the
gates actually report, whether `yarn build` is safe); reading unfamiliar subsystems to locate
code; drafting issue and PR prose; writing unit tests; and running the gates. Code location for
D5 was done **by hand first** — the Sprint 0 rule that you find the code yourself was honoured on
both issues, with the AI confirming and extending the human's starting point rather than
searching from scratch.

**What worked.** The strongest result was not generated code but a *measurement* that contradicted
the documentation four separate times — Node 26 breaking `prisma generate`, `yarn build` migrating
the live database, `yarn lint` printing `FULL TURBO` having checked nothing, and a nested worktree
turning a green suite red (830 files / 208 failed with it present; 406 files / 0 failed with it
excluded — every "failure" a duplicate copy). Each of those was found by running the command and
reading the output rather than by asking.

Diagnosing #10 is the clearest case of the tool earning its keep: the bug as reported ("the save
button is enabled") pointed at the button, and the button was already correct. Reading React's
fiber tree on the running app found the real cause two components away, and turned up a second,
unreported data-corruption bug on the way.

**What did not work, and what was rejected.**

- **Two AI-proposed fixes for #10 were tried and discarded** before the right one. `{ shouldDirty:
  false }` does not work, because react-hook-form derives `formState.isDirty` by deep-comparing
  values independently of that flag — `dirtyFields` went empty while `isDirty` stayed `true`. A
  single-shot "ignore the first emission" guard does not work either, because the editor emits
  twice on mount. Both were found by testing, not by reasoning.
- **A suggestion from the issue author was rejected** with reasons on #4 (the conditional hours
  box, above) — a human product decision the tool was not allowed to make.
- **Formatting churn was reverted.** `biome check --write` reordered imports in
  `CreateEventTypeForm.tsx` and rewrapped an untouched function in `EventSetupTab.tsx`. Lint exits
  0 either way, so the churn was never required — and unrelated lines are lines the author would
  have to defend in review.
- **A self-inflicted bug was caught by reading the diff, not by a gate**: `required` had been put
  on both duration boxes, which would have made a 30-minute event fail native form validation,
  since the hours box is deliberately blank for sub-hour events. There is now a regression test.

**Other members:** `[TEAM INPUT NEEDED]` — tools used, task types, session counts, and a link to
each `ai-logs/sprint0/<username>/` folder. As of 2026-09-15 `git ls-tree -r origin/main ai-logs/`
shows only `README.md` and `.gitkeep` files on `main`; `zach-short`'s four logs are committed
locally but have never been pushed (§8).

---

## 7. Release

**No release or tag exists yet.** `git ls-remote --tags origin` returns nothing and
`gh release list --repo CSCI-435-SE/cal.diy` is empty (both 2026-09-15).

- **Tag to create:** `[TEAM INPUT NEEDED]` — and there is a genuine ambiguity to settle. D7 says
  to use the project's current version with `-csci435-s0` appended, and to use `v0.1.0-csci435-s0`
  "if the project has no prior releases". This fork has **no tags and no releases**, which points
  at `v0.1.0-csci435-s0`; but the code is not version 0 — `apps/web/package.json` reads `6.2.0`
  (the root `package.json` reads `0.0.0`), which points at `v6.2.0-csci435-s0`. The team should
  pick one and say why in the release description.
- **Release description:** owed.
- **Blocker:** creating a tag on the remote needs push access.

---

## 8. Risks and challenges

**1. Read-only repository access — the defining problem of this sprint.**

```
$ gh api repos/CSCI-435-SE/cal.diy --jq .permissions
{"admin":false,"maintain":false,"push":false,"triage":false,"pull":true}
```

`zach-short` has had `pull` only for the entire sprint (verified 2026-09-14, unchanged
2026-09-15). Every consequence below was verified, not inferred:

- **Cannot push a branch**, so **D5 — 30 of the 100 points — cannot be completed**, and "no
  merged PRs" is one of the three conditions that zero the whole sprint. Both PRs are *written,
  tested and gated*; only the push is missing.
- **Cannot create the labels D2 asks for.** `gh label create` returns `HTTP 404` on
  `POST /repos/CSCI-435-SE/cal.diy/labels`.
- **Cannot apply existing labels.** `gh issue edit 12 --add-label bug` →
  `GraphQL: zach-short does not have the correct permissions to execute AddLabelsToLabelable`.
  (The `effort:*` labels now on #11–#14 were applied by someone else — **[UNVERIFIED]** who.)
- **Cannot push the AI logs**, so D4's evidence sits in a local commit.
- **No CI has ever run** on any of this work, because `pr.yml` gates every job behind trust plus
  labels a maintainer sets.

A fork was considered and deliberately ruled out on 2026-09-14 — the decision was to do the work
unforked and push once access is granted. **This is the single highest-value thing to fix before
2026-09-17, 11:59 PM, and it is an ask to the org, not a technical problem.**

**2. Three members show no repository activity.** Two have no issues and no identifiable GitHub
account in this report (§1, §3); a third has 2 issues against a minimum of 4. If that reflects
reality rather than a mapping failure here, D2 (20 pts) and D5 (30 pts, individual) are exposed.

**3. The standards document is unmerged, `WIP:`, and its Definition of Done is empty.** D3 is
graded partly on a coherent DoD. Draft ready at `docs/agent/proposed-definition-of-done.md`.

**4. No release, and an unsettled version number.** §7.

**5. A live file collision between two members' in-flight work.** PR #8 (`zachbowden`, issue #1)
modifies `packages/features/eventtypes/components/CreateEventTypeForm.tsx` and
`packages/lib/constants.ts`. The unopened branch for issue #4 modifies **the same two files**.
Whichever lands first, the other will need a rebase, and the two changes are in adjacent
territory — the title field and the duration field of the same form. **This should be coordinated
on Zulip before either is merged.** *(Discovered 2026-09-15 by comparing `gh pr view 8 --json
files` against the local branch diff; it has not been raised with anyone yet.)*

**6. Documentation that is confidently wrong is a standing hazard.** `students.md` names the wrong
Node version and the wrong Next.js major; `AGENTS.md` and `agents/rules/**` reference three paths
that this fork deleted; `CONTRIBUTING.md` tells everyone to run a command that will migrate their
database. These files are upstream Cal.com's and are not this team's to edit, so the mitigation is
to treat every claim in them as a lead to verify rather than a fact.

**7. Local environment is a deviation, not the documented one.** No Docker here, so Postgres is
native and Mailhog does not run; nothing that sends mail can be tested end to end on this machine.

---

## 9. Sprint 1 ideas

**Features the team intends to tackle:** `[TEAM INPUT NEEDED]` — §3's top-5 proposal is a starting
point for that conversation, not a decision.

**Setup still needed, in priority order:**

1. **Write access for every member** (§8). Nothing else on this list matters until this lands.
2. **Merge the two blocked PRs** (#10, #4) and get teammate review comments on them — D5 requires
   a review comment, not a bare approval.
3. **Finish and merge the standards document**, including a real Definition of Done (§4).
4. **Create the Sprint 0 release tag** once the PRs are merged (§7).
5. **Decide the labelling scheme.** Either get the spec's `scope:`/`type:` labels created, or
   record in `standards.md` that the team is deliberately using `enhancement`/`bug` +
   `effort:*` instead, so the deviation is a choice rather than an accident.
6. **Get each member's D1 evidence into `docs/sprint0/screenshots/`** (§2.1) and each member's AI
   logs into `ai-logs/sprint0/<username>/` (§6).
7. **Agree a Node version and write it down.** 22.14.0 is the version verified to run every gate
   here; `students.md` is wrong and is not ours to edit, so it belongs in `standards.md`.

---

## Appendix — every claim in this report not backed by a dated measurement

Listed so a reader can tell evidence from inference at a glance. Each is marked
**[UNVERIFIED]** or **[TEAM INPUT NEEDED]** at its point of use.

| # | Claim | Why it is not yet evidence |
|---|---|---|
| 1 | `kojoshuay` = Joshua Ko; `julissaehp` = Julissa Hernandez | Inferred by matching the roster to issue authorship. Neither has confirmed it |
| 2 | Issues #1 and #2 are TA-seeded reference issues | `musta55` is not on this team's roster and also appears as an *upstream* commit author. Never confirmed with the TA — and it matters, because PR #8 implements #1 and D5 requires the issue to be someone else's |
| 3 | Demir Batu Beynam and Dylan Han have no GitHub activity | Only proves no activity under an account this report could map to their names |
| 4 | The `effort:*` labels on #11–#14 were applied by someone else | They are present now and `zach-short` cannot apply labels; who applied them was never checked |
| 5 | "5 transcripts, 3 with tracked statistics" for Zach's AI usage | `statistics.json` carries entries for three sessions; the other two transcripts were recovered after the fact and have none. A true total-sessions figure is not derivable from it |
| 6 | The §3 "top 5 features" list | A proposal by one member, not a team decision |
| 7 | The team name | Never chosen |
| 8 | Everything in §2.2 | Drafted from measured notes for Zachary Short to rewrite in his own words; correct as far as it was checked, but not yet in his voice |
| 9 | The §5 file collision between PR #8 and the issue-4 branch | The file overlap is measured; that it will actually conflict on merge is a prediction, and it has not been raised with `zachbowden` |
| 10 | Every member's D1 / D2 / D4 / D5 status other than Zachary Short's | This draft can only see the repository. Anything done outside it is invisible here |
