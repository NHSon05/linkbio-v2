---
description: Create a local Git commit for the selected LinkBio changes.
argument-hint: "[scope or commit message]"
disable-model-invocation: true
---

$ARGUMENTS

Inspect `git status --short` and the staged diff. Use the requested scope, existing staged changes, or the verified task's changed files when the intended scope is clear. If unrelated changes are staged or the scope is ambiguous, ask which files belong in the commit before changing the index.

Stage the selected files, review the staged diff for unrelated changes and secrets using `.claude/rules/security.md`, and create a local commit. Use the supplied message or write a Conventional Commit message that describes the change. Report the commit hash and subject. Publishing is handled by `/push`.
