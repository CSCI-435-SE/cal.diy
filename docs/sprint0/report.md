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

Cal.diy is a self-hosted scheduling system. Users of the software can define their own, custom events that they can either mark as public-facing or unlisted. Cal.diy can be integrated into several calendar services such as google calendar and CalDAV, so that users can automatically have their calendars populated when someone schedules an event.

# Feature backlog summary

A total of `33` issues have been created, with `10` being closed. A large amount of the issues that were created are features.

# Standards document summary

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
#36 - [feat(bookings): require a reason when rescheduling per EventType setting](https://github.com/CSCI-435-SE/cal.diy/pull/36)

# AI tool usage
Zach Bowden: Claude Code, one session, used to locate several things in the codebase and change a line in the API function governing title size. [Session Logs](cal.diy/ai-logs/sprint0/zachbowden/) \
Joshua Ko: Claude Code across two sessions to implement a bug fix and a small feature. [Session Logs](cal.diy/ai-logs/sprint0/kojoshuay/)  
- Helpful with starting the app and explaining code
- I didn't observe difficulties bc the issues are small so far

# Release
(we will need to create a release in the repo)

# Risks and challenges
Understanding the structure of the project was certainly harder than expected. Because of the way the API is layed out, to locate an API call linked to something specific such as a form submission.

# Sprint 1 ideas
