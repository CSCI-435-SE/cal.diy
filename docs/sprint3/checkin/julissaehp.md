
# Sprint 3 Check-in

## 1. What have you implemented so far, and what remains?

For Sprint 3, I've been working on Issue #139, which allows hosts to set a minimum cancellation notice for their bookings. So far, I've implemented the frontend settings component in the Advanced tab. I added a toggle and options for hosts to choose how many minutes before a meeting attendees can cancel. I also added a feature flag so the unfinished functionality stays hidden by default. I wrote automated tests to check the UI behavior and input validation. What remains is connecting the setting to the database, saving the host's selection, and implementing backend restrictions that actually prevent late cancellations.

## 2. What is one thing you learned about testing in your project?

One thing I learned is that testing should check more than whether a component renders correctly. While working on the cancellation notice setting, I learned how important it is to test different user interactions and edge cases. For example, I tested what happens when the feature flag is disabled, when someone enters an invalid number of minutes, and when the host disables cancellations entirely. I also learned that testing a component by itself isn't always enough. You need to make sure it works correctly within the existing page. All 22 tests passed, and I verified that the placement test failed when I intentionally moved the component to the wrong location.

## 3. What is one risk to finishing your work by Nov 19, and what will you do about it?

I think one risk is rushing the work towards the finsih line of the sprint. I thinnk t better that for this sprint going to continue working with the team to be communciating to get the ball rolling on things. 

## Required Code PR

**Issue #139: Minimum Cancellation Notice (Frontend UI)**

PR: [\[PR for Min cancellation notice first part\]](https://github.com/CSCI-435-SE/cal.diy/pull/142)
