# Cal.diy Team Standards

This document is the team's spring standards baseline.

## 1. Coding Conventions

- Formatting/linting is enforced by Biome (`biome.json`): 110-char lines, 2-space indent, double quotes, semicolons always, es5 trailing commas, sorted imports. Run `yarn biome check --write .` before committing.
- TypeScript strict mode; use `import type { X }` for type-only imports; never use `as any`.
- Prisma queries use `select`, never `include` (performance + avoids leaking sensitive fields like `credential.key`).
- Import from source files directly, never through barrel `index.ts` files (e.g. `@calcom/ui/components/button`, not `@calcom/ui`).
- Errors: `ErrorWithCode` in services/repositories/utilities; `TRPCError` only inside tRPC routers.
- Early returns over nested conditionals.
- Comments explain **why**, never **what** — see [agents/rules/quality-code-comments.md](../../agents/rules/quality-code-comments.md).
- File naming: `Prisma<Entity>Repository.ts`, `<Entity>Service.ts` (PascalCase, no `.service.ts`/`.repository.ts` suffixes on new files).
- All user-facing strings go through `t()` and are added to `packages/i18n/locales/en/common.json`.

- Before opening a PR, each contributor self-reviews their own diff for at least the items above — don't rely on CI/reviewers to catch a missed `as any` or a stray `include`.

## 2. Branching and Commit Conventions

**Adopted from the project** (per [students.md](../../students.md#contributing-workflow)):

- Branch-based workflow, not forks — everyone has write access to the shared repo.
- `main` is protected; direct pushes are blocked. All changes go through a reviewed PR.
- Branch naming:

  | Prefix | Use for |
  |---|---|
  | `feat/issue-<N>-short-description` | new features |
  | `fix/issue-<N>-short-description` | bug fixes |
  | `chore/short-description` | docs, config, dependency updates |

- Always branch from a freshly-pulled `main`.
- Commit messages follow Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`), referencing the issue number where relevant, e.g. `feat: add dark mode toggle (#17)`.
- Delete your branch after the PR merges.
- Never force-push or rebase shared/main branches.

## 3. Pull Request Process

**Adopted from the project** (per [CONTRIBUTING.md](../../CONTRIBUTING.md) and [.github/PULL_REQUEST_TEMPLATE.md](../../.github/PULL_REQUEST_TEMPLATE.md)):

- Check existing issues/PRs first to avoid duplicate work.
- Open PRs in **draft mode** by default; mark ready for review only once self-reviewed.
- Size limit: **<500 lines changed, <10 code files** (docs/lockfiles/generated files excluded). Split larger changes by layer, feature component, or refactor-vs-feature.
- PR title uses Conventional Commits format: `feat(scope): description`.
- Fill out the PR template: summary at the top, `Fixes #XXXX` / `Closes #XXXX` to auto-link the issue, a visual demo (screenshot or recording) when the change is user-facing, and how the change was tested.
- Checklist before requesting review: self-reviewed, docs updated (or marked N/A), tests in place, no new warnings, no secrets committed.
- Run `yarn type-check:ci --force` and `yarn biome check --write .` locally before pushing; push before checking CI (CI runs on the remote, not local commits).

**Course requirement**

- **Implement issues you did not write.** No two team members implement the same issue.

1. Read the issue carefully; ask the issue author if anything is unclear.
2. Find the relevant code **yourself first, without AI** — read the directory structure, search the codebase, inspect files, trace call/dependency chains, and take notes. This is "concept location."
3. **Then** confirm your hypothesis with AI. Let AI validate or extend your understanding — it helps you move faster, it does not substitute for your own reading.

- The PR must be linked to a GitHub issue (`Closes #<number>` in the description).
- The PR description must explain **what** changed and **why**.
- Tests must be written or updated for any code changed.
- The PR must be reviewed by **at least one other team member** before merging — a review **comment** is required, not just an approval click.
- The PR must pass CI if CI is configured for the project. **CI configuration is not required for Sprint 0** — if none exists yet, say so in the PR description.
- **You must be able to explain every line of your PR.** 

## 4. Testing Expectations

**Adopted from the project** (per [agents/rules/testing-coverage-requirements.md](../../agents/rules/testing-coverage-requirements.md)):

- New or modified code should carry **~80%+ test coverage**; aim for near-100% on isolated unit logic.
- Unit tests: Vitest, run with `TZ=UTC yarn test` (timezone-sensitive logic must be tested under UTC).
- E2E tests: Playwright — only required to run in CI when the PR carries the `ready-for-e2e` label.
- A PR is not "tested" until the automated tests proving the fix/feature actually pass locally.

## 5. AI Tool Use

**Adopted from the project** (per [AGENTS.md](../../AGENTS.md) and [agents/rules/culture-leverage-ai.md](../../agents/rules/culture-leverage-ai.md)):

- AI tools (Claude Code, Cursor, ChatGPT, etc.) are encouraged for boilerplate, test generation, documentation, and repetitive refactors.
- Humans remain responsible for complex business logic, architectural decisions, security-sensitive code, and domain edge cases — AI assistance doesn't lower the bar there.
- CI is the final check regardless of how code was produced; AI-assisted code must pass the same type-check/lint/test/coverage gates as anything else.


**Course requirement**

- Each team member sets up **at least one agentic AI tool** for code-level work. Options: **Claude Code** (recommended; course Claude Team plan available), GitHub Copilot (VS Code/JetBrains/Cursor), Cursor (built-in agent mode), OpenAI Codex CLI, or Gemini CLI.
- Chat-based tools (Claude, ChatGPT, Gemini web) may additionally be used for non-agentic tasks — understanding code, drafting, research.

- Agentic CLI tools (Claude Code, Gemini CLI, Codex CLI): wrap the session with **SpecStory** (`specstory run claude`, etc.) so it's captured automatically.
- Cursor / GitHub Copilot in VS Code: install the **SpecStory VS Code extension**.
- Web chat (Claude, ChatGPT, Gemini): use the browser exporter extensions from the AI Log Instructions page.
- Store logs at `ai-logs/sprint<N>/<your-github-username>/` in the team repo (see [ai-logs/README.md](../../ai-logs/README.md) for filename convention and the AI Log Instructions page for the issue-comment format).


## 6. Definition of Done

**Adopted from the project** (assembled from `CONTRIBUTING.md`, `AGENTS.md`, and `.github/PULL_REQUEST_TEMPLATE.md` — no single file states this as a unified DoD, so it's consolidated here):

A change is "done" when:

- [ ] Code follows the conventions in [Section 1](#1-coding-conventions).
- [ ] `yarn type-check:ci --force` passes.
- [ ] `yarn biome check --write .` passes with no new warnings.
- [ ] Relevant unit tests pass (`TZ=UTC yarn test`); Playwright tests pass if applicable.
- [ ] Test coverage on new/changed code meets the ~80%+ expectation ([Section 4](#4-testing-expectations)).
- [ ] No secrets, API keys, or `.env` files are committed.
- [ ] No new UI strings without a corresponding translation key in `packages/i18n/locales/en/common.json`.
- [ ] PR follows the process in [Section 3](#3-pull-request-process): draft → self-reviewed → template filled out → issue linked (`Closes #<number>`) → within size limits.
- [ ] Any AI tool use is logged per [Section 5](#5-ai-tool-use).
- [ ] Documentation updated if the change affects developer-facing docs (or explicitly marked N/A).

**Course requirement**

- [ ] Reviewed by at least one other team member, with an actual review **comment** left on the PR (an approval click alone doesn't count).
- [ ] CI passes if CI is configured for the project; **CI is not required to be configured for Sprint 0** — note this in the PR description if it isn't yet.
- [ ] You can explain every line of the PR yourself, including any AI-generated parts, if asked by a reviewer or the instructor.

