---
description: Implement an approved task using specialized subagents.
argument-hint: "[task ID or goal]"
disable-model-invocation: true
---

$ARGUMENTS

Implement the requested task or goal. With no arguments, use the approved plan from this conversation when available, or select the next unblocked implementation task in `docs/TASKS.md`.

## Preparation

- Read `AGENTS.md` and the project documents it lists.
- Follow `.claude/rules/orchestration.md`.
- Confirm the task scope and approval status.

## Execution

1. Identify the required subagents.
2. Resolve task dependencies.
3. Assign explicit file ownership.
4. Delegate independent tasks in parallel.
5. Delegate dependent tasks sequentially.
6. Collect and integrate agent outputs.

## Validation

1. Run lint and type checks for application changes.
2. Delegate relevant testing to `qa`.
3. Delegate substantial code review to an independent specialist or `qa`.
4. Fix blocking issues.
5. Re-run validation after fixes.

## Completion

- Record verified progress using `.claude/rules/documentation.md`.
- Report changed files.
- Report test results.
- Report unresolved issues.

Do not commit, push or deploy automatically.
