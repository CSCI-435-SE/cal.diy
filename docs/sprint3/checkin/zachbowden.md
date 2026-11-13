# What have you implemented so far, and what remains?

So far, I have worked on issue 138, which lets a host confirm or reject individual occurrences of a booking instead of having to handle the whole series at once. That gives hosts more control over their schedules. I have opened a pull request for it (https://github.com/CSCI-435-SE/cal.diy/pull/140). I still have two more pull requests to complete. I don't have an ETA for those yet, because our team first needs to fill the issues backlog with more well-defined tasks. Once those issues are written and assigned, I can start on my remaining work.

# What is one thing you have learned about testing in your project?

I have learned that the project's testing framework is very easy to use. Most tests follow a simple pattern: render a view, trigger an event, and then check whether certain elements are present on the page. For example, to confirm that the code handles errors correctly, you can trigger the event that should cause the error and then check that the error element appears. This pattern makes tests quick to write and easy to read. It has also made me more confident about adding tests alongside my features, because covering both expected and failure cases takes very little extra work.

# What is one risk to finishing your work by Nov 19, and what will you do about it?

The main risk is that we start too late. In past sprints our team often began late and then had to work long hours to finish the final parts before the deadline. That rushes the work, makes mistakes more likely, and adds stress for everyone. This time, I plan to communicate more with my teammates. I will check in regularly on progress and raise blockers early so they don't pile up at the end. Still, I can only do so much on my own. If teammates don't communicate back, it will be hard to coordinate, so I will keep following up.
