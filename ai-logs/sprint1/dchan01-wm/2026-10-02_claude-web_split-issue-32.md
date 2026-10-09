# Split Issue 32

**Created:** 10/2/2026 12:47:29  
**Updated:** 10/8/2026 12:28:09  
**Exported:** 10/8/2026 23:13:02  
**Link:** [https://claude.ai/chat/612a4246-7003-44da-a954-1e2cd1e7472d](https://claude.ai/chat/612a4246-7003-44da-a954-1e2cd1e7472d)  

## User:

> 10/2/2026 12:47:31

Hey Claude! You are an expert in issue triage for coding. Can you help me decompose this issue (considered a large issue) into multiple medium issues that are reasonable to complete within one sprint? For context, I am working on a fork of Cal.diy.

Here is the issue:

### Summary

When setting availability, the current native method is to manually give hour ranges in text boxes. Adding un-contiguous blocks of time involves hitting a "+" button and entering more ranges in text boxes. The intent of this feature is to streamline the process by adding a visual method (the calendar) to select availabilities.

### Rough Scope: medium/large
Requires creating a whole new UI element (the calendar), setting up its behavior (the dragging, reverse dragging to unselect selected hours), making sure it integrates with the database, making sure its fields (the selected available hours) are consistent with the manual text field method.

### Source:
Thinking about what I would actually use (google calendars has it, When2Meet has it). It is much more convenient to drag th ecalendar than to enter text.

### Is your proposal related to a problem?

I am a user trying to set my available hours, and I find it frustrating to input hours in a text field. It is especially frustrating when I have to fill in un-contiguous blocks of time. In order to make setting up times more convenient, I want there to be another option to fill in times, similar to google calendar or When2Meet, where I can drag across a calendar to indicate my weekly availability.

### Describe the solution you'd like

I would like there to be either a toggle button to switch back and forth between the current text-field mode, and a new calendar dragging mode. When in the calendar mode, I would like to be able to drag my mouse across the calendar to indicate times when I am available (or conversely when I am NOT available). The calendar should have the hours on the Y axis (so the top is midnight and the bottom is 11:59PM), and the days of the week are across the x axis. When I edit something on the calendar, I want the fields to update on the text-field mode automatically (and vice versa).

## Assistant:

> 10/2/2026 12:47:54

Here's a breakdown of the large issue into medium-sized sprint-ready issues:

---

## Issue 1: Build the Weekly Availability Grid Component

**Labels:** `frontend`, `ui`, `new-component`

**Summary:** Create a new React component that renders a weekly grid with days of the week on the X-axis and hours (midnight to 11:59 PM) on the Y-axis. This is the foundational visual element for the drag-to-select availability feature.

**Acceptance Criteria:**
- Grid displays 7 columns (days of week) and 24 rows (hours)
- Time labels are rendered on the Y-axis (e.g. 12:00 AM, 1:00 AM, …)
- Day labels are rendered on the X-axis (Sun, Mon, …)
- Cells can be in a "selected" or "unselected" visual state (distinct styles)
- Component accepts availability state as a prop and renders it correctly
- Component is responsive and fits within the existing availability settings page layout

**Out of scope:** Drag interaction, data syncing, DB integration — those are separate issues.

---

## Issue 2: Implement Drag-to-Select Interaction on the Availability Grid

**Labels:** `frontend`, `interaction`, `ui`

**Summary:** Add mouse drag (and touch) interaction to the availability grid component so users can click-and-drag to select or deselect blocks of time.

**Acceptance Criteria:**
- Clicking and dragging across cells selects them
- The direction of selection (select vs. deselect) is determined by the state of the first cell the user drags from — if it was unselected, the drag selects; if it was selected, the drag deselects ("reverse drag")
- Selection is visually updated in real time as the user drags
- Drag interaction works on touch devices (mobile)
- Mouse-up / touch-end commits the selection
- No accidental text selection occurs during drag

**Out of scope:** Syncing with text fields, saving to DB.

---

## Issue 3: Add Toggle to Switch Between Text-Field and Calendar Grid Modes

**Labels:** `frontend`, `ui`, `settings`

**Summary:** Add a toggle button on the availability settings page so users can switch between the existing text-field input mode and the new visual calendar grid mode.

**Acceptance Criteria:**
- A clearly labeled toggle (e.g. "Text" / "Visual") appears on the availability settings page
- Only one mode is visible at a time
- Toggle state persists within the session (does not reset on re-render)
- Both modes occupy the same general layout area to minimize page reflow
- Existing text-field UI is completely unmodified

**Out of scope:** Syncing data between modes — handled in Issue 4.

---

## Issue 4: Sync State Between Calendar Grid and Text-Field Inputs

**Labels:** `frontend`, `state-management`

**Summary:** Ensure that changes made in the visual calendar grid are reflected in the text-field inputs, and vice versa, so both views remain consistent with a single shared availability state.

**Acceptance Criteria:**
- A shared availability data model (e.g. array of `{ day, startTime, endTime }` intervals) is defined and used by both the grid and text-field components
- Selecting cells in the grid updates the corresponding text field ranges
- Editing text fields updates the corresponding grid cells
- Non-contiguous time blocks are represented correctly in both views
- No data loss or rounding errors occur when converting between the two representations

**Out of scope:** Saving to database — that's Issue 5.

---

## Issue 5: Integrate Visual Availability State with the Database

**Labels:** `backend`, `integration`, `database`

**Summary:** Ensure the shared availability state produced by the new visual grid (and existing text fields) is correctly saved to and loaded from the database, with no regressions to the existing save/load flow.

**Acceptance Criteria:**
- Availability set via the calendar grid is correctly persisted when the user saves
- Saved availability loads correctly and populates both the grid and text fields on page load
- The data format sent to the API is identical regardless of which input mode was used
- No regressions to existing text-field save/load behavior
- Edge cases handled: overnight ranges (e.g. 11 PM – 1 AM), empty availability, fully-booked days

**Out of scope:** UI for the grid or toggle — those are earlier issues.

---

### Suggested Sprint Order

| Order | Issue | Dependency |
|---|---|---|
| 1 | Build the Weekly Grid Component | None |
| 2 | Implement Drag-to-Select Interaction | Issue 1 |
| 3 | Add Toggle Between Modes | Issue 1 |
| 4 | Sync State Between Grid and Text Fields | Issues 1, 2, 3 |
| 5 | DB Integration | Issue 4 |

Issues 2 and 3 can be parallelized once Issue 1 is done, and Issue 5 is a clean backend-focused task that can be picked up by a different team member while frontend work on Issue 4 is underway.

## User:

> 10/2/2026 13:06:37

Hey Claude, can you please adapt these issues to fit this format? The #ORIGINAL ISSUE and #ADDITIONAL INFORMATION are just to denote that I am pulling from two sources to create the template (the repo has the #ORIGINAL ISSUE template, and my class enforces that #ADDITIONAL INFORMATION template).

# ORIGINAL ISSUE REPORT FORMAT

### Is your proposal related to a problem?

<!--
  Provide a clear and concise description of what the problem is.
  For example, "I'm always frustrated when..."
-->

(Write your answer here.)

### Describe the solution you'd like

<!--
  Provide a clear and concise description of what you want to happen.
-->

(Describe your proposed solution here.)

### Describe alternatives you've considered

<!--
  Let us know about other solutions you've tried or researched.
-->

(Write your answer here.)

### Additional context

<!--
  Is there anything else you can add about the proposal?
  You might want to link to related issues here, if you haven't already.
-->

(Write your answer here.)

### Requirement/Document

<!--
  Is there any type of document that could support that feature?
-->

(Share it here.)

---

# ADDITIONAL INFORMATION THAT MUST BE ADDED

## User Story
As a [type of user], I want [goal] so that [benefit].

## User Scenario
[A concrete walkthrough of how a user encounters and uses this feature.]

## Acceptance Criteria
1. ...
2. ...
3. ...

## Out of Scope
- ...

## Open Questions
-

## Assistant:

> 10/2/2026 13:07:44

Here are all five issues reformatted:

---

## Issue 1: Build the Weekly Availability Grid Component

### Is your proposal related to a problem?

Users currently set availability by manually typing hour ranges into text boxes. There is no visual representation of the week, making it hard to get an intuitive sense of one's availability at a glance. Before any drag-to-select behavior can be added, a visual weekly grid component needs to exist as the foundation.

### Describe the solution you'd like

Create a new React component that renders a weekly grid with days of the week (Sun–Sat) on the X-axis and hours (12:00 AM–11:59 PM) on the Y-axis. Cells in the grid can be in a "selected" or "unselected" state, visually distinct from one another. The component accepts availability state as a prop and renders accordingly.

### Describe alternatives you've considered

A simple list-based visual (e.g. a column of time blocks per day without a true grid) was considered, but a proper grid is necessary to support the drag interaction in later issues and to match the UX pattern users recognize from tools like When2Meet and Google Calendar.

### Additional context

This is the foundational component for the visual availability feature. Issues 2 (drag interaction), 3 (mode toggle), 4 (state sync), and 5 (DB integration) all depend on this component existing first.

### Requirement/Document

- When2Meet grid UI (https://www.when2meet.com) as a UX reference
- Google Calendar week view as a UX reference
- Existing availability settings page in Cal.diy for layout constraints

---

## User Story
As a Cal.diy user, I want a visual weekly grid showing days and hours so that I have a spatial representation of my availability to interact with.

## User Scenario
A user navigates to the availability settings page. Instead of seeing only text boxes, they see a 7-column, 24-row grid with day labels across the top and hour labels down the left side. Cells that correspond to currently set available hours appear highlighted. The user can see their whole week's availability at a glance without reading any text fields.

## Acceptance Criteria
1. Grid renders 7 columns (Sun–Sat) with day labels on the X-axis
2. Grid renders 24 rows with hour labels (12:00 AM, 1:00 AM, … 11:00 PM) on the Y-axis
3. Cells have visually distinct "selected" and "unselected" states (e.g. filled vs. unfilled color)
4. Component accepts an availability prop and renders selected cells accordingly
5. Component fits within the existing availability settings page without breaking layout
6. Component is responsive across common screen sizes

## Out of Scope
- Drag-to-select interaction (Issue 2)
- Toggle between grid and text-field modes (Issue 3)
- Syncing grid state with text fields (Issue 4)
- Database reads/writes (Issue 5)

## Open Questions
- Should the grid snap to 30-minute increments or stay at 1-hour increments to match the current text-field granularity?
- Should the Y-axis start at midnight or at a configurable earliest hour (e.g. 6:00 AM) to reduce whitespace?

---
---

## Issue 2: Implement Drag-to-Select Interaction on the Availability Grid

### Is your proposal related to a problem?

Even once a visual grid exists, it is static and cannot be interacted with. Users need to be able to click and drag across cells to select or deselect blocks of time, matching the intuitive interaction pattern from tools like When2Meet.

### Describe the solution you'd like

Add mouse and touch drag interaction to the weekly grid component. When a user clicks and drags across cells, those cells become selected. The mode of the drag (selecting vs. deselecting) is determined by the initial state of the first cell touched — if unselected, the drag selects; if selected, the drag deselects. The selection updates visually in real time as the user drags, and is committed on mouse-up or touch-end.

### Describe alternatives you've considered

A click-per-cell toggle (no drag) was considered but rejected as too tedious for selecting large blocks of time — the primary complaint motivating this feature. A dedicated "erase mode" button was considered as an alternative to reverse-drag deselection, but reverse-drag is more in line with When2Meet's established UX.

### Additional context

Depends on Issue 1 (grid component). The committed selection state produced by this interaction will be consumed by Issue 4 (state sync with text fields). No database calls are made in this issue.

### Requirement/Document

- When2Meet drag interaction as primary UX reference
- Browser `mousemove` / `touchmove` event documentation for implementation guidance

---

## User Story
As a Cal.diy user, I want to click and drag across the availability grid to select or deselect blocks of time so that I can set non-contiguous availability quickly without typing.

## User Scenario
A user wants to mark Tuesday 9:00 AM–12:00 PM as available. They click on the 9:00 AM cell in the Tuesday column, hold the mouse button, drag down to the 11:00 AM cell, and release. All three cells highlight in real time as they drag. To remove the 10:00 AM slot they accidentally included, they click it and drag — since it was already selected, the drag deselects. On mobile, the same behavior works with a finger drag.

## Acceptance Criteria
1. Clicking and dragging across cells selects them in real time during the drag
2. The drag mode (select vs. deselect) is locked to the state of the first cell touched at drag start
3. Mouse-up or touch-end commits the selection
4. Touch / mobile drag is supported
5. Page does not scroll or trigger text selection during a drag on the grid
6. Cells outside the grid do not get affected if the cursor leaves the grid mid-drag

## Out of Scope
- Syncing drag results with text fields (Issue 4)
- Saving to the database (Issue 5)
- Keyboard-based selection

## Open Questions
- Should dragging diagonally select cells in both the row and column directions, or only the primary drag direction?
- Is there a maximum selection size to enforce, or can a user select the entire grid in one drag?

---
---

## Issue 3: Add Toggle to Switch Between Text-Field and Calendar Grid Modes

### Is your proposal related to a problem?

Once the visual grid exists, users need a way to switch between the existing text-field input method and the new visual grid. Both modes need to coexist so that users who prefer text entry are not forced onto the new UI.

### Describe the solution you'd like

Add a clearly labeled toggle control (e.g. a segmented button reading "Text" / "Visual") to the availability settings page. Activating it swaps which input mode is visible. Only one mode is shown at a time. The toggle persists within the session.

### Describe alternatives you've considered

A permanent side-by-side layout showing both modes simultaneously was considered, but it would be too visually heavy and confusing. A one-time onboarding prompt to pick a default mode was considered, but a persistent in-page toggle is simpler and more discoverable.

### Additional context

Depends on Issue 1 (grid component must exist to be toggled in). Issue 4 (state sync) will make switching between modes lossless — this issue only handles the visibility toggle, not data consistency. The existing text-field UI must remain completely unmodified.

### Requirement/Document

- Existing availability settings page layout in Cal.diy for placement reference

---

## User Story
As a Cal.diy user, I want a toggle that switches between the text-field and visual grid input modes so that I can choose whichever method suits me without losing my availability data.

## User Scenario
A user lands on the availability settings page and sees the familiar text-field inputs. They notice a "Visual" toggle button at the top of the section, click it, and the text fields are replaced by the weekly grid view. They click "Text" to switch back and the text fields reappear. The toggle is visible and accessible regardless of which mode they are currently in.

## Acceptance Criteria
1. A toggle control with at least two states ("Text" and "Visual") is present on the availability settings page
2. Selecting "Visual" hides the text-field UI and shows the grid component
3. Selecting "Text" hides the grid and shows the text-field UI
4. Only one mode is rendered/visible at a time
5. Toggle selection persists through re-renders within the same session
6. The existing text-field component code is not modified

## Out of Scope
- Persisting the user's preferred mode to the database across sessions
- Syncing data between modes when switching (Issue 4)

## Open Questions
- Should the toggle default to "Text" for all users initially, or should it remember the last-used mode in local storage?
- Where exactly should the toggle be placed — above the availability section header, inline with it, or elsewhere?

---
---

## Issue 4: Sync State Between Calendar Grid and Text-Field Inputs

### Is your proposal related to a problem?

With both a visual grid and text fields present on the page, changes made in one mode must be reflected in the other. Without a shared data model and sync logic, switching modes would cause the user to lose their work or see inconsistent availability data.

### Describe the solution you'd like

Define a single shared availability data model (e.g. an array of `{ day, startTime, endTime }` intervals) that both the grid and text-field components read from and write to. When a user selects cells in the grid, the text field ranges update automatically. When a user edits the text fields, the corresponding grid cells update. Non-contiguous time blocks must be correctly represented in both views.

### Describe alternatives you've considered

Keeping two separate state trees and running a one-time conversion on toggle was considered, but risks data loss if the conversion has edge cases. A single source of truth with two-way bindings is more robust, though it requires careful handling of the differing representations (cell-based vs. range-based).

### Additional context

Depends on Issues 1, 2, and 3. This is the most logic-heavy frontend issue. Issue 5 (DB integration) depends on the clean shared state produced here. Pay particular attention to edge cases: non-contiguous blocks, overnight ranges, and rounding when converting between cell-based and time-range representations.

### Requirement/Document

- Existing availability data format in Cal.diy codebase (check current API payload for the save endpoint)

---

## User Story
As a Cal.diy user, I want changes I make in the visual grid to automatically appear in the text fields (and vice versa) so that both views always reflect my current availability without me having to re-enter data.

## User Scenario
A user selects Monday 9:00 AM–11:00 AM by dragging on the grid. They toggle to text-field mode and see a range of "9:00 AM – 11:00 AM" already filled in for Monday. They then manually type an additional range of "2:00 PM – 4:00 PM" in the text field. They toggle back to the visual grid and see both blocks highlighted correctly on Monday.

## Acceptance Criteria
1. A single shared availability state model is defined and used by both components
2. Dragging on the grid updates the corresponding text-field ranges in real time (or on drag commit)
3. Editing a text field updates the corresponding grid cells
4. Non-contiguous time blocks are correctly represented in both views
5. No data is lost or rounded incorrectly when converting between cell-based and range-based representations
6. Overnight ranges (e.g. 11:00 PM – 1:00 AM) are handled without errors

## Out of Scope
- Persisting state to the database (Issue 5)
- UI for the toggle or grid (Issues 1–3)

## Open Questions
- How should conflicts be resolved if a text field has a range that falls between cell boundaries (e.g. 9:15 AM when cells snap to 30-min increments)?
- Should syncing happen live as the user types in the text field, or only on blur/confirm?

---
---

## Issue 5: Integrate Visual Availability State with the Database

### Is your proposal related to a problem?

Even with a working visual grid and synced state, availability set via the new UI will not persist if the save/load flow is not updated to handle the shared data model. The database integration must be verified to work correctly regardless of which input mode the user was in when they saved.

### Describe the solution you'd like

Verify and update the save and load flow so that the shared availability state from Issue 4 is correctly written to and read from the database. On save, the API payload must be identical in format whether the user used the grid or text-field mode. On load, the fetched data must correctly populate both the grid and the text fields.

### Describe alternatives you've considered

Introducing a separate API endpoint specifically for grid-mode saves was considered, but keeping a single endpoint and data format is simpler, less error-prone, and avoids divergence in the backend.

### Additional context

Depends on Issue 4 (shared state must be stable before wiring to the DB). This is primarily a backend and integration issue and can be picked up in parallel with late-stage frontend work on Issue 4. Regression testing of the existing text-field save/load path is required.

### Requirement/Document

- Existing availability save/load API endpoint in Cal.diy
- Current database schema for availability/schedule records

---

## User Story
As a Cal.diy user, I want my availability to be saved and reloaded correctly regardless of whether I used the visual grid or the text fields so that my settings persist between sessions.

## User Scenario
A user sets their availability using the visual grid on Monday morning, hits Save, and closes the tab. When they return in the afternoon and navigate back to the availability settings page, the grid and text fields both show the availability they set earlier, with no missing blocks or corrupted ranges.

## Acceptance Criteria
1. Saving availability set via the grid sends the same API payload format as saving via text fields
2. Loaded availability from the database populates both the grid and text fields correctly on page load
3. Non-contiguous time blocks survive a full save-and-reload cycle without merging or data loss
4. Existing text-field save/load behavior has no regressions
5. Edge cases are handled correctly: empty availability, fully-booked days, and overnight ranges (e.g. 11:00 PM – 1:00 AM)

## Out of Scope
- UI changes (all covered in Issues 1–3)
- State sync logic (Issue 4)
- User preference for default input mode

## Open Questions
- Does the existing database schema support non-contiguous blocks per day, or does it need a migration?
- Should overnight ranges be stored as a single record spanning midnight, or split into two records at the day boundary?

Powered by Claude Exporter (https://www.ai-chat-exporter.net)
