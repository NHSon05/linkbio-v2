# AGENTS.md — LinkBio Agent Router

**Start here.** Read `docs/project_summary.md`, `docs/ARCHITECTURE.md`, `docs/data-model.md`, `docs/API_Contract.md`, `docs/plan.md`, and `docs/TASKS.md` before delegation.

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
- Plan of record: `docs/plan.md` (v2) and `docs/sprint-plan-v2.md`. Database and SSO tasks wait for the open questions there.
- URL (v2 target, approved 2026-11-26): system-wide `/{slug}` and `/{slug}/{category}/{subcategory}`; immutable page ID; reserved names rejected. The code serves `/{username}/{pageSlug}` until Sprint 6 migrates it; keep that working and redirect old URLs.
- Validate JSON-driven UI; never execute arbitrary user HTML/JS/CSS.
- Enforce Supabase RLS and server-side ownership (later company role) checks.
- Our database objects live in schema `linktree` (helpers in `linktree_private`), never in `public`: Eosoft's shared project already uses `public.profiles`, `sites`, `site_members`, and more.
- Draft != published != live; a failed publish keeps the last live version.
- Public pages render on demand and are cached per page (`'use cache'` + `cacheTag`, refreshed with `updateTag`); no full-site rebuilds. Do not introduce Astro, CloudFront, GrapesJS or dedicated workers without approval.
- Never fabricate completed tests, deployments or subagent execution.

## Start orchestration

The Claude Code project settings load `orchestrator` as the main agent. Use `/plan`, `/implement`, `/review`, and `/test` to run individual stages. Use `/commit` to create a local commit and `/push` to publish commits. Use `/orchestrate <task ID or goal>` to coordinate a specific task or `/orchestrate` to start the next unblocked implementation task.
