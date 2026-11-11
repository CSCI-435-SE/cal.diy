# Sprint 3 carryovers from Sprint 2

Checked on GitHub on 2026-11-09. Update the status column before the Sprint 3 report.

| Item | Owner | Status on 2026-11-09 | Next step |
|---|---|---|---|
| #63 Day-of-week recurrence selection | `dchan01-wm` | Open, Sprint 2 milestone | Decide whether #117 / PR #126 already covers it; close it with a link or move it to Sprint 3 with the remaining criteria. |
| #64 Configurable recurrence end conditions | `dchan01-wm` | Open, Sprint 2 milestone | Move to the Sprint 3 milestone, or record it as Sprint 4 work in the report. |
| #118 Only offer a recurring event's repeat days on the booking page | `dchan01-wm` | Open, no milestone | Add to a milestone and confirm the spec is reviewed before code. |
| #50 Calendar view for bookings | `dbbeynam` | Open, Sprint 2 milestone | Owner posts current state; team decides to move it to Sprint 3 or reassign. |
| #52 Bulk actions on the bookings list | `dbbeynam` | Open, Sprint 2 milestone | Same as #50. |
| #67 Force admin users to enable 2FA | unassigned | Open, no milestone; pulled from Sprint 2 by `julissaehp` | Check whether PR #120's site-wide setting already covers admins; close it or assign an owner. |
| #68 Force all users to enable 2FA | `kojoshuay` | Open, no milestone | PR #120 (closes #112) shipped the site-wide required-2FA modal and onboarding step. Owner checks #68's criteria against #120 and closes it, or lists the gap. |
| PR #125 waitlist (#13) follow-up | `zachbowden` | #13 closed; PR merged with fixes not re-verified | Add one test for each review bug: blank panel on fully booked days (`AvailableTimes.tsx` early return), six-hour hold shortened or deleted by reserve/release, duplicate offers on retry or concurrent tasks. Open a bug issue for any test that fails. |
| #130 Hours on the partial-day away panel | `zach-short` | Open, Sprint 3 milestone | Already planned for Sprint 3; no carryover action. |

Also close the Sprint 2 milestone once every open item in it has moved or closed.
