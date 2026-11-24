# Subagent Orchestration Rules

## 1. Task Classification

Read `AGENTS.md` and its project references. Check the working tree and preserve existing changes. Match the work to the requested command's scope.

Classify every task before execution:

- Simple: Execute directly.
- Medium: Delegate to relevant specialists.
- Complex: Plan, delegate, integrate and review.

## 2. Agent Routing

Use the owner listed in `docs/TASKS.md` or the routing table in `AGENTS.md`. Route architecture and contract decisions to `architect`, test execution to `qa`, and code review to an independent specialist or `qa`. Keep orchestration-owned tasks, shared-file edits, and integration in the main conversation.

## 3. Planning

For complex tasks:

1. Analyze requirements.
2. Consult architect when necessary.
3. Define acceptance criteria.
4. Break work into subtasks.
5. Identify dependencies.
6. Assign file ownership.
7. Request approval for major changes.

## 4. Execution

- Execute independent tasks in parallel.
- Execute dependent tasks sequentially.
- Never assign overlapping files to parallel agents.
- Use isolated Git worktrees when appropriate.
- Wait for required dependencies before proceeding.
- Provide each agent with sufficient task context.

## 5. Agent Handoff

Every delegated task must include:

- Task ID, when applicable
- Objective
- Relevant contracts, rules, and context
- Allowed files
- Dependencies
- Constraints
- Acceptance criteria
- Expected output

Every agent must return:

- Status: completed, blocked or failed
- Summary of changes
- Files changed
- Validation results
- Remaining issues

## 6. Failure Handling

- Identify the root cause.
- Return failed work to the responsible agent.
- Re-run relevant validation after fixes.
- Escalate unresolved blockers to the user.
- Never hide failed tests.

## 7. Quality Gate

Before completing a feature:

1. Integrate all agent outputs.
2. Run lint and type checks for application code changes.
3. Run relevant tests.
4. Request an independent specialist review for substantial changes.
5. Resolve blocking findings.
6. Record verified progress using `.claude/rules/documentation.md`.

## 8. Completion

The main agent owns the final integration.

Only mark a task complete when its acceptance
criteria and required quality gates are satisfied.
