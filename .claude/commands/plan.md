---
description: Analyze a feature and create an implementation plan.
argument-hint: "[task ID or goal]"
disable-model-invocation: true
---

$ARGUMENTS

Plan the requested task or goal. With no arguments, consider the next unblocked implementation task in `docs/TASKS.md`.

1. Read `AGENTS.md`, the project documentation it lists, and `.claude/rules/orchestration.md`.
2. Delegate read-only technical analysis to `architect` when the work needs architectural input.
3. Consult other specialists when necessary.
4. Identify affected modules and dependencies.
5. Define acceptance criteria.
6. Break the feature into actionable tasks.
7. Assign a responsible agent to each task.
8. Identify parallel and sequential tasks.
9. Present the implementation plan for approval. Keep this command read-only.
