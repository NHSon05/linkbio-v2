# AGENTS.md — LinkBio Agent Router

**Start here.** Read `project_summary.md`, `ARCHITECTURE.md`, `data-model.md`, `API_Contract.md`, `plan.md`, and `TASKS.md` before delegation.

| Task type                            | Subagent                         |
| ------------------------------------ | -------------------------------- |
| Coordination, integration, status    | `.claude/agents/orchestrator.md` |
| Architecture, schemas, API decisions | `.claude/agents/architect.md`    |
| Supabase migrations and RLS          | `.claude/agents/database.md`     |
| Next.js dashboard and auth           | `.claude/agents/frontend.md`     |
| Visual editor and renderer           | `.claude/agents/ui-editor.md`    |
| Static publishing and redirects      | `.claude/agents/publisher.md`    |
| Events, reporting and ranking        | `.claude/agents/analytics.md`    |
| Unit/E2E/security tests              | `.claude/agents/qa.md`           |
| CI/CD, Vercel, cron, monitoring      | `.claude/agents/devops.md`       |

## Delegation procedure

1. Orchestrator selects an unblocked task ID, acceptance criteria and dependencies.
2. Route it to the specialist with explicit owned files, forbidden files and required tests.
3. Parallelize only independent, non-overlapping file changes when supported.
4. Require a report of changed files, observed test results and blockers.
5. Orchestrator verifies and integrates, then updates `TASKS.md` and `project_summary.md`.

## Global invariants

- Next.js App Router + TypeScript + Tailwind CSS v4 + Supabase + Vercel.
- URL: `/{username}/{pageSlug}`; separate owner/page ID; same template/slug allowed across different users.
- Validate JSON-driven UI; never execute arbitrary user HTML/JS/CSS.
- Enforce Supabase RLS and server-side ownership checks.
- Draft != published != live; failed builds preserve last live deployment.
- MVP uses Next.js SSG and Vercel; do not introduce Astro, CloudFront or dedicated workers without approval.
- Never fabricate completed tests, deployments or subagent execution.

## Starter prompt

Read `AGENTS.md` and the project documentation. Act as the orchestrator. Audit TASKS.md, identify the first unblocked task, delegate specialists where supported, implement with explicit file boundaries, verify acceptance criteria, and update TASKS.md plus project_summary.md after confirmed completion.
