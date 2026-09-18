# Coding conventions
- Formatting/linting is enforced by Biome (`biome.json`): 110-char lines, 2-space indent, double quotes, semicolons always, es5 trailing commas, sorted imports. Run `yarn biome check --write .` before committing.
- TypeScript strict mode; use `import type { X }` for type-only imports; never use `as any`.
- Prisma queries use `select`, never `include` (performance + avoids leaking sensitive fields like `credential.key`).
- Import from source files directly, never through barrel `index.ts` files (e.g. `@calcom/ui/components/button`, not `@calcom/ui`).
- Errors: `ErrorWithCode` in services/repositories/utilities; `TRPCError` only inside tRPC routers.
- Early returns over nested conditionals.
- Comments explain **why**, never **what** - see [agents/rules/quality-code-comments.md](../../agents/rules/quality-code-comments.md).
- File naming: `Prisma<Entity>Repository.ts`, `<Entity>Service.ts` (PascalCase, no `.service.ts`/`.repository.ts` suffixes on new files).
- All user-facing strings go through `t()` and are added to `packages/i18n/locales/en/common.json`.

- Before opening a PR, each contributor self-reviews their own diff for at least the items above - don't rely on CI/reviewers to catch a missed `as any` or a stray `include`.

# Branching and commit conventions

- Branch-based workflow, not forks - everyone has write access to the shared repo.
- `main` is protected; direct pushes are blocked. All changes go through a reviewed PR.
- Branch naming: `docs|feat|fix`/`name`
    + example: The branch that added this document is called `docs/standards-guidelines`
- Always branch from a freshly-pulled `main`.
- Commit messages follow Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`), referencing the issue number where relevant, e.g. `feat: add dark mode toggle (#17)`.
- Delete your branch after the PR merges.
- Never force-push or rebase shared/main branches.
- Commit names should be present tense description of largest changes.
    - `Add [insert big feature]`
    - `Remove [insert unneeded feature]`
    - `Fix [insert bug here]`

# Pull request process
Summarize your pull request at the top. Use the same prefix standard as branch names. (i.e. doc related PR would begin with `doc:`)

If your pull request addresses anything mentioned by existing issues, link those issues in your pull request description. For pull requests that are not ready to be reviewed, they must be prefixed with `WIP:` to indicate they are a work in progress, and therefore should not be reviewed for merging.
# Testing expectations
Testing the changes locally is the baseline expectation. Additionally, tests will need to be written for any new features added.

- New or modified code should carry **~80%+ test coverage**; aim for near-100% on isolated unit logic.
- Unit tests: Vitest, run with `TZ=UTC yarn test` (timezone-sensitive logic must be tested under UTC).
- E2E tests: Playwright — only required to run in CI when the PR carries the `ready-for-e2e` label.
- A PR is not "tested" until the automated tests proving the fix/feature actually pass locally.

# AI tool use
If a contributor utilizes artificial intelligence to generate code, they must **review every line generated** and have at least a basic working understanding of what the code does (i.e. an answer of "I don't know" to the question "what does this AI generated function do" would be unacceptable). The contributor also accepts full responsibility of any AI generated code. An AI agent **cannot be held accountable**.

![IBM training slides](https://cdn.lexza.ch/file/ffa6YaKwwn.png)

# Definition of Done

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
