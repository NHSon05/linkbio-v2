---
description: Review implementation using specialized agents.
argument-hint: "[paths or Git range]"
disable-model-invocation: true
---

$ARGUMENTS

Review the requested paths or Git range. With no arguments, inspect the staged, unstaged, and relevant untracked changes.

1. Inspect `git status` and the relevant diff.
2. Follow `.claude/rules/orchestration.md` to delegate read-only review to an independent specialist or `qa`.
3. Consult `database` for schema and RLS changes.
4. Consult `architect` for architectural changes.
5. Consult `qa` for missing test coverage.
6. Consolidate all findings.

Classify findings by severity.

- Critical
- High
- Medium
- Low

Include file paths, line references, impact, and recommended fixes. If there are no findings, report any verification gaps.

Keep the review read-only.
