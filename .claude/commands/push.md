---
description: Push the current branch's commits to its configured Git upstream.
argument-hint: "[remote branch]"
disable-model-invocation: true
---

$ARGUMENTS

Identify the current branch and destination. Use its configured upstream or the remote and branch explicitly supplied by the user. Request a destination if the branch has no upstream and no destination was provided.

Review the outgoing commits and check for secrets using `.claude/rules/security.md`. Push only the current branch's existing commits to the selected destination with a normal Git push. Report the destination and resulting commit, or the rejection and its cause.
