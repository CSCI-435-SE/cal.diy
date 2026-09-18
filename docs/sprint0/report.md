# Our Team

We are "The Calendars"! We are working on a fork of [cal.diy](https://github.com/calcom/cal.diy), an open source version of [cal.com](https://cal.com/). You can see our fork [here](https://github.com/CSCI-435-SE/cal.diy).

| Name       | GitHub Username     |
|------------|--------------------|
| Joshua Ko  | kojoshuay          |
| Zachary Short | zach-short        |
| Julissa Hernandez | julissaehp |
| Zach Bowden | zachbowden         |
| Dylan Han | dchan01-wm |
| Demir Beynam | dbbeynam |



# Project Overview

**What does the system do? Who are its users? What are its main features?**
- Cal.diy is a self-hosted, open-source scheduling/booking platform (a Cal.com fork). Users are hosts (individuals or teams who share booking links) and the guests who book time with them. Main features: customizable event types, calendar sync, availability rules and team/round-robin scheduling, automated workflows/notifications, an embeddable booking widget, and an app-store for third-party integrations.

**What are the main components and how do they interact?**
- `apps/web` (Next.js frontend + API routes) calls into `packages/trpc` (type-safe API layer), which delegates to `packages/features` (business logic, organized as vertical slices) and `packages/lib` (shared utilities). Those read/write through `packages/prisma` (Prisma ORM over PostgreSQL). `apps/api` is a separate REST API (v1/v2) that reuses the same underlying logic via `packages/platform/libraries` rather than importing `features`/`trpc` directly. `packages/app-store` plugs in third-party calendar/video/payment integrations, and `packages/ui`/`coss-ui` supply shared UI components consumed by `apps/web`.

**What are the major technologies, frameworks, and external services?**
- Next.js, TypeScript, tRPC, Prisma + PostgreSQL, NextAuth.js for auth, Tailwind CSS, Vitest (unit) + Playwright (E2E), next-i18next for translations, Biome for lint/format, all inside a Yarn 4 + Turborepo monorepo. External integrations include Google Calendar, Office365/Outlook, CalDAV, Stripe for payments, and video-conferencing apps (Zoom, Google Meet, Daily.co); Mailhog and Docker Postgres are used for local development.

**How is the code organized (directory structure, key packages/modules)?**
- `apps/web` — the main Next.js app; `apps/api` — standalone REST API v1/v2; `packages/prisma` — DB schema and migrations; `packages/trpc` — tRPC routers; `packages/features` — feature-specific business logic; `packages/lib` — shared utilities; `packages/ui` / `packages/coss-ui` — shared UI components; `packages/app-store` — third-party app integrations; `packages/platform` — SDK/atoms and shared libraries for embeds and API v2; `packages/i18n` — translation files.

**How do developers typically contribute? What is the PR and code review workflow?**
- The team uses a branch-based workflow: branch off a freshly-pulled `main` with a `feat/issue-<N>-...`, `fix/issue-<N>-...`, or `chore/...` name, push, and open a PR back into `main` (which is branch-protected — no direct pushes). PRs are opened in draft mode, kept under ~500 lines/10 files, titled with Conventional Commits, and must link the issue (`Closes #N`), fill out the PR template (summary, demo if user-facing, self-review, tests), pass type-check/Biome/tests, and get at least one reviewer comment before merging.

**What are the standards for issue reporting, triage, and management?**
- Contributors check existing issues/PRs first to avoid duplicates and use the repo's issue templates. Feature requests need the `🚨 needs approval` label removed by a core team member before work starts; bugs, security, performance, and docs issues can be picked up immediately. Issues are triaged by priority label (Low, Medium, High, Urgent) based on whether they touch core flows (booking, login, email) versus minor UX polish.

# Feature backlog summary

A total of `35` issues have been created, with `11` being closed. A large amount of the issues that were created are features. Many issues were related to creating an account, allowing the user to input more information / more easily input more information (e.g. split minute field in to hours and minutes, add more fine-grain Out of Office times, calendar UI for inputting available hours), and general new features (AI support for finding settings, add favorite buttons)

As of now, we are most interested in implementing:
- Calendar to input availability - similar to Google Calendar / when2meet; seems useful for the average user
- setting event themes - the ability to customize the appearance of events and their booking pages seem like fun to use
- insights dashboard - apparently the original Cal.com has a dashboard for seeing data about their events: the busiest times, most and least booked events, cancellation reasons, etc. - this seems like it could make the user's life easier with one place to see all the data

[Link to issues](https://github.com/CSCI-435-SE/cal.diy/issues)

# Standards document summary

- Coding Conventions: Biome enforces formatting; use TypeScript strict mode, select in Prisma queries, direct source imports, appropriate error types, and translation keys for all user-facing strings.
- Branching & Commits: Branch off main using docs|feat|fix/name naming, write Conventional Commits in present tense, and never force-push or rebase shared branches.
- Pull Requests: PRs need a prefixed summary matching the branch name, linked issues, and a WIP: prefix if not ready for review.
- Testing: Aim for ~80%+ test coverage using Vitest for unit tests (UTC timezone) and Playwright for E2E, which only runs in CI under the ready-for-e2e label.
- AI Tool Use: Contributors must review and understand every line of AI-generated code and take full responsibility for it.
- Definition of Done: A PR is complete when it passes type-check, Biome, and tests; has no committed secrets; includes translation keys; and has a properly filled-out, self-reviewed PR with updated docs.
- Branching & Commits: Branch off main using docs|feat|fix/name naming, write Conventional Commits in present tense, and never force-push or rebase shared branches.
- Pull Requests: PRs need a prefixed summary matching the branch name, linked issues, and a WIP: prefix if not ready for review.
- Testing: Aim for ~80%+ test coverage using Vitest for unit tests (UTC timezone) and Playwright for E2E, which only runs in CI under the ready-for-e2e label.
- AI Tool Use: Contributors must review and understand every line of AI-generated code and take full responsibility for it.
- Definition of Done: A PR is complete when it passes type-check, Biome, and tests; has no committed secrets; includes translation keys; and has a properly filled-out, self-reviewed PR with updated docs.

Almost all of our standards are pulled directly from the existing documentation (e.g. CONTRIBUTING.md, AGENTS.md, and the agents/ folder) and the sprint0 instructions.

# Screenshots of app running locally
<img width="800" alt="Screenshot 2026-09-08 104349" src="https://github.com/user-attachments/assets/64139f82-4ccf-4712-a897-6b4a1b97c945" />
<img width="800" alt="Screenshot 2026-09-08 104451" src="https://github.com/user-attachments/assets/dd51e7e1-1698-4cc1-9f48-e8f13da666b7" />
<img width="800" alt="Screenshot 2026-09-08 104439" src="https://github.com/user-attachments/assets/4b31d46b-0909-42c9-a929-9db28515ea10" />

# Screenshots of the test suite
<img width="800" alt="test_suite_1" src="https://github.com/user-attachments/assets/275ced3e-4323-4c8f-a25b-90873883d5a1" />
<img width="800" height="171" alt="test_suite_2" src="https://github.com/user-attachments/assets/85886a35-1da9-4c77-bac7-c2dd07e366b9" />

# Completed PRs

#31 - [fix: fixed NaN displaying on event edit sidebar](https://github.com/CSCI-435-SE/cal.diy/pull/31)\
#30 - [feat: event title char limit](https://github.com/CSCI-435-SE/cal.diy/pull/30)\
#20 - [fix: stop the description editor marking an untouched event type as changed (#10) - #20](https://github.com/CSCI-435-SE/cal.diy/pull/20)\
#7 - [docs: Add standards and guidelines doc](https://github.com/CSCI-435-SE/cal.diy/pull/7)\
#28 - [feat: add character counter](https://github.com/CSCI-435-SE/cal.diy/pull/28)\
#21 - [feat: enter event duration as hours and minutes (#4)](https://github.com/CSCI-435-SE/cal.diy/pull/21)\
#40 - [fix: visual password validation bug](https://github.com/CSCI-435-SE/cal.diy/pull/40)\
#44 - [feat(event-types): add tooltips to preview and dropdown-menu buttons](https://github.com/CSCI-435-SE/cal.diy/pull/44)\
#47 - [fix: translate copy-link toast on event-type edit page](https://github.com/CSCI-435-SE/cal.diy/pull/47)\
#36 - [feat(bookings): require a reason when rescheduling per EventType setting](https://github.com/CSCI-435-SE/cal.diy/pull/36)\
#37 - [feat(event-types): add "Require reschedule reason" setting and dialog gating](https://github.com/CSCI-435-SE/cal.diy/pull/37)\
#42 - [fix(auth): gate signup submit button on real form validity-#42](https://github.com/CSCI-435-SE/cal.diy/pull/42)\

# AI tool usage
Zach Bowden: Claude Code, one session, used to locate several things in the codebase and change a line in the API function governing title size. [Session Logs](cal.diy/ai-logs/sprint0/zachbowden/) \
Joshua Ko: Claude Code across two sessions to implement a bug fix and a small feature. [Session Logs](cal.diy/ai-logs/sprint0/kojoshuay/)  
- Helpful with starting the app and explaining code
- I didn't observe difficulties bc the issues are small so far\

Julissa Hernandez: Claude code across 2 sessions to implement a bug and a medium feature.  [Session Logs](cal.diy/ai-logs/sprint0/julissaehp/) 
- Helped with finding the files and editing. 
- Also helped with double checking things and Answering questions about the repo.

Dylan Han: Claude Code (CLI) and Claude Web
- Types of Tasks: planning (implementation plan), debugging, generating code (test cases, feature implementations), explaining concepts (better understand how React/TS works, what the guidelines of the repository are)
- Total sessions: 5 (2 Web, 3 CLI)
- Link to logs: [link](https://github.com/CSCI-435-SE/cal.diy/tree/main/ai-logs/sprint0/dchan01-wm)
- Worked very well for finding documents / summarizing code; worked well at double checking itself (I was surprised when I asked it to generate test cases, and it went through the codebase and found examples of similar tests and used them as precedent/a pattern for new test cases); I do not think anything worked poorly with the AI, I intentionally followed a plan then implement flow which seemed to smoothen the experience.

Zachary Short: 8 Claude Code Sessions; [link](https://github.com/CSCI-435-SE/cal.diy/tree/main/ai-logs/sprint0/zach-short); writing code, estimating the cost of certain actions, finding bugs/feature ideas

# Release
[v6.2.0-csci435-s0](https://github.com/CSCI-435-SE/cal.diy/releases/)

*Does not link directly to the release because of chicken and egg situation: the report needs the release link, but to make the release you need the final report!*

# Risks and challenges
- Understanding the structure of the project was certainly harder than expected. Because of the way the API is layed out, to locate an API call linked to something specific such as a form submission.
- Concept location, especially with an unfamiliar framework (React). Finding where a given element was defined as very difficult with all of the subfolders of components
- Finding features: it was legitimately difficult to think of features because it seemed like the project implemented most of the basic, required features for a good booking app. If we had an idea, it was probable that it was already implemented
- How can we think of more features?
- How can we more effectively find components in order to know what to modify?
- How can we use our experience in Sprint 0 to improve our AI workflow in Sprint 1?
- Potential to slow progress: most of the Issue backlog is medium/high effort changes. Most of the features we have implemented were fairly simple, so tackling more difficult changes could slow down Sprint 1

# Sprint 1 ideas
- we would potentially like to focus on granularity: allowing the user to input more precise information aboutbookings. For example, saying that you are out of office from 10AM to 3PM instead of just "All Day".
- we would also like to implement some smaller things, like favorite buttons or default landing pages (where you go after logging in), which could subtly improve the user experience.
