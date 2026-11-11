# Sprint 3 mid-sprint check-in: zach-short

**Code PR:** TODO — link the #130 PR here before Nov 12, 11:59 PM (it must be open and ready for review, or merged).

## What have you implemented so far, and what remains?

So far my Sprint 3 work is planning. For the team feature, #131 (OIDC sign-in), I drafted the spec with 43 acceptance criteria, nine design decisions with alternatives, and a breakdown into nine sub-issues with a Sprint 3 demo slice (PR #133). I posted our questions to the customer on #131. For #130 (hours on the partial-day away panel) I wrote the build plan and a draft Test Evidence table, one row per acceptance criterion.

What remains: the #130 code PR after its spec review, my OIDC sub-issue once the team assigns owners, its spec review and PR, and mutation testing with StrykerJS on one of my issues.

## What is one thing you learned about testing in your project?

Passing tests only show that the code does what the tests expect, not what the spec asks. In Sprint 2, PR #125 (waitlist) passed all 45 existing tests, yet a review found three real bugs: a blank panel on fully booked days, a six-hour hold cut to five minutes, and duplicate offers on retry. No test had checked those cases, because the tests followed the code's main path.

So for #130 I wrote the expected values from the acceptance criteria before writing any code. For example, a 14:10 to 14:50 window must print 14:10 and 14:50, not the 14:00 and 15:00 slot times.

## What is one risk to finishing your work by Nov 19, and what will you do about it?

The biggest risk is the OIDC demo. It needs five sub-issues merged in order, and one of them changes the 1,255-line `next-auth-options.ts`, where a mistake in account linking can let one user log in as another. Every sub-issue also needs a spec review and an approval before merge, so a one-day wait at each step adds up.

To reduce this, the breakdown has a merge order so that two people can work in parallel after the first PR. The account-linking code waits for the customer's answer. Until then we reject matching emails, which is safe. I will also ask for reviews on Zulip the day each PR opens.
