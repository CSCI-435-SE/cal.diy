## What have you implemented so far, and what remains?
So far, I have implemented the running late feature. In the case that an organizer of an event will be late, the organizer can send an email to all attendes to let them know the organizer will be late. What remains is implementing another medium issue. 

## What is one thing you learned about testing in your project?
One major thing I learned about is Zod, which is a TypeScript schema declaration and validation library that lets me write strict rules for my data, and enforces those rules in real time. 

For example, an organizer is only supposed to send a delay email for 5,10,15, or 30 mins. Without Zod, a malcious user can intercept the network request and send bad numbers, such as -999999 or a string. Zod blocks that request and returns an error. 

## What is one risk to finishing your work by Nov 19, and what will you do about it?
One risk is I have two midterms on the week of Nov 19th, but I since I have already implemented one medium issue, I have no worries about completion by the deadline. 

Link to PR: https://github.com/CSCI-435-SE/cal.diy/issues/139
