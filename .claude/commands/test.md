---
description: Run the checks relevant to a LinkBio task or working-tree change.
argument-hint: "[task ID, paths, or suite]"
disable-model-invocation: true
---

$ARGUMENTS

Verify the requested scope or the current changes when no scope is given. Route test work to `qa` using `.claude/rules/orchestration.md`.

Use the scripts and suites configured in `package.json`, CI, or the applicable test configuration. Start with focused checks, then run broader checks when the changed behavior warrants it. Use local or test environments. Report the commands, outcomes, skipped checks, and missing prerequisites. Keep implementation edits outside this verification run.
