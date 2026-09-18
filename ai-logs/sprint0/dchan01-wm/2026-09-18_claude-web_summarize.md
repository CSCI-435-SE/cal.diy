# Document summary request

**Created:** 9/18/2026 0:46:18  
**Updated:** 9/18/2026 0:47:11  
**Exported:** 9/18/2026 1:19:20  
**Link:** [https://claude.ai/chat/5bf2a411-cefb-43a5-9949-cccf4ff84dbe](https://claude.ai/chat/5bf2a411-cefb-43a5-9949-cccf4ff84dbe)  

## User:

> 9/18/2026 0:46:19

> File: 

Hey Claude, can you please summarize this document? Thanks!

## Assistant:

> 9/18/2026 0:46:27

Here's a summary of the document:

**Coding Conventions**
Biome enforces formatting (110-char lines, 2-space indent, double quotes, etc.). TypeScript strict mode is required, Prisma queries must use `select` (not `include`), and imports should come directly from source files — not barrel `index.ts` files. Use `ErrorWithCode` in services/repos and `TRPCError` only in tRPC routers. All user-facing strings need translation keys.

**Branching & Commits**
Everyone works on branches (not forks) off a freshly-pulled `main`. Branch names follow a `docs|feat|fix/name` pattern. Commit messages follow Conventional Commits (`feat:`, `fix:`, etc.) and should be present-tense descriptions. Force-pushing and rebasing shared branches is prohibited.

**Pull Requests**
PRs need a summary with the same prefix as the branch name, and should link any related issues. Work-in-progress PRs must be prefixed with `WIP:`.

**Testing**
Local testing is the baseline. New/modified code should have ~80%+ test coverage (near 100% for isolated unit logic). Unit tests use Vitest (run under UTC timezone); E2E tests use Playwright and only run in CI when the `ready-for-e2e` label is applied.

**AI Tool Use**
Contributors using AI to generate code must review every line, understand what it does, and take full responsibility for it.

**Definition of Done**
A checklist covering: passing type-check and Biome, test coverage, no committed secrets, translation keys for new UI strings, a properly filled-out PR, and updated documentation where applicable.

## User:

> 9/18/2026 0:47:07

Can you please consolidate it into 1 bullet point for each section?

## Assistant:

> 9/18/2026 0:47:11

Sure!

- **Coding Conventions:** Biome enforces formatting; use TypeScript strict mode, `select` in Prisma queries, direct source imports, appropriate error types, and translation keys for all user-facing strings.
- **Branching & Commits:** Branch off `main` using `docs|feat|fix/name` naming, write Conventional Commits in present tense, and never force-push or rebase shared branches.
- **Pull Requests:** PRs need a prefixed summary matching the branch name, linked issues, and a `WIP:` prefix if not ready for review.
- **Testing:** Aim for ~80%+ test coverage using Vitest for unit tests (UTC timezone) and Playwright for E2E, which only runs in CI under the `ready-for-e2e` label.
- **AI Tool Use:** Contributors must review and understand every line of AI-generated code and take full responsibility for it.
- **Definition of Done:** A PR is complete when it passes type-check, Biome, and tests; has no committed secrets; includes translation keys; and has a properly filled-out, self-reviewed PR with updated docs.

Powered by Claude Exporter (https://www.ai-chat-exporter.net)
