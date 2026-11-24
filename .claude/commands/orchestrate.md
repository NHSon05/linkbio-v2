---
description: Coordinate LinkBio work with the project’s specialist subagents.
argument-hint: "[task ID or goal]"
disable-model-invocation: true
---

Coordinate the requested LinkBio task from the main conversation. Read `AGENTS.md` for agent routing and `.claude/rules/orchestration.md` for the workflow.

$ARGUMENTS

- For a task ID or goal, work within the requested scope and check its prerequisites. If an unmet dependency prevents progress, report the dependency and what is still needed.
- With no arguments, select the highest-priority unblocked implementation task in `docs/TASKS.md`. Use backlog order to break ties and state the task ID before delegating. If no implementation task is ready, report the backlog status.
- For planning, status, or review requests, limit execution to the work the user requested.
