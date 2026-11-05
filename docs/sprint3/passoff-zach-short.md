# Continue Sprint 3 for zach-short on the Mac mini

Written 2026-11-05 on the MacBook, for a fresh session on the Mac mini. It stands alone: the personal board and ledger stay on the MacBook and are not in this branch.

**Model: Default (Opus 5.5) for orientation and the Stryker trial. Deep (Fable 5.1) for the #130 build, in its own session. Waits on a teammate spec review for the build only.**

## Orientation

You are picking up cal.diy (`CSCI-435-SE/cal.diy`), a course-org fork of Cal.com, for Zach (`zach-short`, CSCI 435). Read these first, in this order: the Sprint 3 spec (https://csci-435-se.github.io/sprint3/), issue #130 (`gh issue view 130 -R CSCI-435-SE/cal.diy`), `AGENTS.md`, `CONTRIBUTING.md`, and the `agents/rules/*.md` files for what you touch.

`HANDOFF.md`, `PASSOFF.md`, `CLAUDE.local.md`, `docs/AGENT-PRACTICES.md` and `docs/agent/` are excluded from git and exist only on the MacBook. If the Mac mini has no copies, this file replaces them for this work. Do not recreate them from memory.

Session rules:

- Run `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"` before any yarn command. Node 26 breaks `yarn prisma generate`.
- Do not commit or push unless Zach asks in this session: print `git add <exact files>` and `git commit -m "<conventional, lowercase>"` and stop. Never `git add -A` or `git add .`. No `Co-Authored-By`, no "Generated with" line.
- Always pass `--force` to `yarn type-check:ci` and `yarn lint`, because turbo replays cached results.
- Run tests with `TZ=UTC` and `--exclude '**/.claude/**'`. Worktrees sit inside the repo, and vitest counts them.
- `select`, never `include`. No `as any`. Use no API you have not seen in this checkout.
- Zach must be able to explain every line of his PRs, so explain choices as you go.
- Talk to Zach in ASD-STE100 Simplified Technical English.

Checkout setup, once per machine:

```bash
yarn
```

```bash
cp .env.example .env
```

Then set `NEXTAUTH_SECRET` (`openssl rand -base64 32`) and `CALENDSO_ENCRYPTION_KEY` (`openssl rand -base64 24`) in `.env`. Never paste those values anywhere. Then:

```bash
yarn prisma generate
```

```bash
yarn type-check:ci --force
```

`yarn build` applies migrations to whatever `DATABASE_URL` names. Use `SKIP_DB_MIGRATIONS=1 yarn build`. Check `pg_isready -h localhost -p 5432` before you trust a database-backed test.

## Why this exists

Sprint 3 runs 2026-11-03 to 2026-11-19, with a heavy focus on test quality. The check-in and one code PR, open and ready for review or merged, are due 2026-11-12 at 23:59. Everything else is due 2026-11-19 at 23:59. Late PRs were the main complaint about Sprint 2.

## What is fixed

State on 2026-11-05. Read this before changing anything; do not relitigate it.

- Milestone "Sprint 3" exists (#3, due 2026-11-19).
- Issue #130 is Zach's first medium issue: posted, labelled, assigned, on the milestone. The spec review was not yet requested when this was written.
- The second medium slot is held for a sub-issue of the team feature. No team feature issue existed on 2026-11-05. The fallback is #12, a hardening issue, but it is `scope: small`, so it does not fill the slot alone.
- Zach has no Sprint 2 carryovers. #5 and #104 are closed.
- D6 needs StrykerJS with the Vitest runner; the spec names it. It is not in the repo. The MacBook trial was proposed but not started, and Zach has not yet approved the dependency.
- The graded D6 run belongs on the files changed by the #130 PR. The target is `docs/sprint3/mutation/130-zach-short.md`, with reports in `docs/sprint3/mutation/reports/`.

## Do these, in order

1. Run the checkout setup and paste the type-check result, because a cold checkout fails for unrelated reasons.
2. Check #130 for a spec review comment, and check the tracker for a team feature issue. Tell Zach what you find, because both change what comes next.
3. Ask Zach to approve the Stryker dependency. On a yes, run a trial on `packages/features/schedules/lib/date-ranges.ts` in a worktree. Read the Stryker docs through Context7 first. Confirm how its sandbox copies the project, and check free disk space. The trial proves the tool works; it is not the graded run.
4. When the review is posted, build #130 from the prompt below, in a Fable 5.1 session. If this session is not on Fable 5.1, do not build it here. Hand Zach that section to run there.
5. Draft `docs/sprint3/checkin/zach-short.md` (about 100 words each: what is done and what remains, one thing learned about testing, one risk and the plan for it; plus the PR link). Zach must supply his own answers, because this is his reflection.

## Ask before building

- **owner's call:** adding the Stryker dev dependency, and whether the team shares one config. Either answer may be no.
- **owner's call:** which team feature sub-issue Zach takes, once the feature is posted.

## Not in scope, whoever asks

Editing `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md` or `agents/rules/**`. Merging this branch: it only carries this file, so delete it when the work has moved. The team report and release (D8, D9) unless Zach asks.

## Hand back

Report the setup result, the state of #130 and the team feature, and the Stryker outcome with its run time. Give Zach the next step and any git blocks.

## Build prompt: print the window's hours on the away panel, one panel per entry (issue #130)

**Model: Deep (Fable 5.1). Lane C. Waits on a teammate spec review comment on #130.** Own worktree under `.claude/worktrees/issue-130`, cut from `origin/main`, branch `feat/issue-130-ooo-window-hours`. Deep because a wrong time on the panel passes every gate and looks right to a person in one time zone.

You are picking up cal.diy (`CSCI-435-SE` fork of Cal.com), a course project. Read issue #130 in full first (`gh issue view 130 -R CSCI-435-SE/cal.diy`), then the Sprint 3 spec D4 and D6 (https://csci-435-se.github.io/sprint3/), then `AGENTS.md` and the `agents/rules/*.md` files for what you touch. The checkout setup is at the top of this file.

Session rules. Run `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"` before any yarn command. Never run `git commit`, `git push`, `git add -A` or `git add .`: print two bash blocks, `git add <exact files>` and `git commit -m "<conventional, lowercase>"`, and stop. No `Co-Authored-By`, no "Generated with" line. No `as any`. `select`, never `include`. Use no API you have not seen in this checkout. Zach must be able to explain every line, so explain the choices as you go. Chat replies use ASD-STE100.

**Why this exists.** An attendee sees an away panel in the middle of a day and has to guess the hours from the gap between slots. A slot that straddles the leave time makes the gap wider than the window. Two back-to-back entries are worse: they show one panel, for the first entry only, so the second entry's reason and redirect are lost. If hours were added without fixing that, the panel would print a wrong time.

**What is fixed.** Read these before changing anything; do not relitigate them. Citations are from `origin/main` at `e01d161c0c`.

- Zach accepted these on 2026-11-05. A window that covers every slot keeps the whole-day layout and adds the hours. Overlapping entries keep today's behavior, first matching window wins, and their ranges may overlap on screen. The panel does not name the time zone.
- Design, on the issue: two optional ISO fields on each away slot a window marks, and a new panel when the window's start or end differs from the previous slot. Rejected: a per-date list in the response, working out hours from slot times, comparing reason and note, one panel listing all windows.
- Team events are out of scope, and this is not a gap: `getAggregatedAvailability.ts` uses `oooExcludedDateRanges` for them, for whole-day entries too.
- `findOutOfOfficeForSlot` returns the window as `data` (`packages/features/schedules/lib/slots.ts:16-25`). The slot is built at `slots.ts:245-258`. A whole-day record has no `start`, so take the new fields from a window only. Check that a date record's top-level copy of the first window (`getUserAvailability.ts:235-237`) cannot leak them onto another slot.
- A multi-day entry sits under every date it touches, with its full `start` and `end` (`getUserAvailability.ts:825-845`). That is why criterion 3 needs dates.
- `util.ts:1275` and `:1290` pass slot fields through with a spread. API v2 filters away slots (`slots-output.service.ts:49`, `:119`). The atoms keep their own `SlotInfo`; leave it alone.
- The server rejects only exact duplicates (`outOfOfficeCreateOrUpdate.handler.ts:152-161`), so back-to-back and overlapping entries are real. The defect was found by reading and was not run: write its test first and watch it fail.
- `AvailableTimes.tsx`: the `oooAllDay` return renders `slots[0]` only, and `isAway(merged[index - 1])` joins adjacent windows. It already reads `timeFormat` and `timezone` from `useBookerTime`. The test file `AvailableTimes.test.tsx` has a harness to copy, and it widens `Slot` locally at line 43; criterion 8 removes that.
- Worktrees sit inside the repo, so run tests with `--exclude '**/.claude/**'` or the count lies.

Do these, in order:

1. Confirm the spec review comment is on #130. If it is not, stop. If it asks for changes, bring them to Zach, because the spec changes before the code does.
2. Run the checkout setup in the worktree, and paste the type-check result. A cold worktree fails for reasons unrelated to this work.
3. Write failing tests first, with expected values worked out by hand from the criteria, never copied from output. Sprint 3 D4 rejects the code's own output as a source. Include a host and attendee in different zones, a DST change day, and 12-hour and 24-hour formats.
4. Build the slot fields, then the pure formatter (two instants, zone, format), then the panel split, then the string in `packages/i18n/locales/en/common.json`. Keep the formatter pure because D6 mutates it and criteria 1 to 3 then need no rendering.
5. Fix `SlotInfo`, then remove `getPartialDayOutOfOfficeRanges` (`date-ranges.ts:279`) and move every case from `date-ranges.test.ts:1297` onto `getPartialDayOutOfOfficeWindows`. Lose no case, because mutation runs depend on them.
6. Walk it in the browser as `pro` with two back-to-back entries, with the booking page set to another time zone. Tests do not show that the panel reads well.
7. Draft the PR body in a file outside git: `Closes #130`, Design, Tech Debt, and the Test Evidence table with one row per criterion, its level and its source of expected value. Include "Not tested automatically, and why" and "AI-written tests".

Ask before building:

- **owner's call:** the wording of the new string. The issue's example is "Away 9:00am to 10:00am". Zach may prefer other text, or none around the times.
- **owner's call:** if the diff passes 10 code files or 500 lines, split it (panel split and defect first, hours second) or trim the cleanup. The issue sits at the limit. Either answer may be no.

Not in scope, whoever asks: team events; a discriminated union for `IOutOfOfficeData`; the platform atoms; the redirect switch in the form; overlap rules on the server; StrykerJS setup (a separate step above).

Hand back:

```bash
yarn prisma generate
```

```bash
yarn type-check:ci --force
```

```bash
yarn lint --force
```

```bash
TZ=UTC yarn test --exclude '**/.claude/**'
```

```bash
VITEST_MODE=timezone yarn test --exclude '**/.claude/**'
```

Green means exit 0 for type-check, 0 lint errors, and 0 failed tests that need no database. Measured 2026-09-14: 4119 tests, 0 failed; the count has grown since. Also give Zach the steps to see the two panels himself, the two git blocks, and this suggested message: `feat: show the hours of a partial-day out-of-office window (#130)`. Remind him that the code PR must be open and ready for review by 2026-11-12, that a teammate must approve the latest commit before he merges, and that he captures the SpecStory transcript to `ai-logs/sprint3/zach-short/`.
