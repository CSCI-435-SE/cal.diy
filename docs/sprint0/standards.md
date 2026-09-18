# Coding conventions
# Branching and commit conventions
### Branch names
`docs|feat|fix`/`name`

example: The branch that added this document is called `docs/standards-guidelines`
### Commit names
Present tense description of largest changes.
- `Add [insert big feature]`
- `Remove [insert unneeded feature]`
- `Fix [insert bug here]`

# Pull request process
Summarize your pull request at the top. Use the same prefix standard as branch names. (i.e. doc related PR would begin with `doc:`)

If your pull request addresses anything mentioned by existing issues, link those issues in your pull request description. For pull requests that are not ready to be reviewed, they must be prefixed with `WIP:` to indicate they are a work in progress, and therefore should not be reviewed for merging.
# Testing expectations
Testing the changes locally is the baseline expectation. Additionally, tests will need to be written for any new features added.
# AI tool use
If a contributor utilizes artificial intelligence to generate code, they must **review every line generated** and have at least a basic working understanding of what the code does (i.e. an answer of "I don't know" to the question "what does this AI generated function do" would be unacceptable). The contributor also accepts full responsibility of any AI generated code. An AI agent **cannot be held accountable**.

![IBM training slides](https://cdn.lexza.ch/file/ffa6YaKwwn.png)

# Definition of Done
