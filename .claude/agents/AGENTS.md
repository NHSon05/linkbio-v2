# LinkBio — Agent Orchestration Guide

## Project

LinkBio Platform

A multi-tenant, schema-driven landing page builder.

## Technology Stack

- Next.js App Router
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- Supabase
- Vercel

## Mandatory Reading

Before implementing tasks, read:

1. ARCHITECTURE.md
2. data-model.md
3. API_Contract.md
4. plan.md (v2) and sprint-plan-v2.md
5. TASKS.md
6. project_summary.md

## Available Subagents

| Agent        | Responsibility             |
| ------------ | -------------------------- |
| orchestrator | Task coordination          |
| architect    | System architecture        |
| database     | Supabase and RLS           |
| frontend     | Next.js Dashboard          |
| ui-editor    | Visual Editor and Renderer |
| publisher    | Static generation          |
| analytics    | Tracking and ranking       |
| qa           | Testing                    |
| devops       | CI/CD and infrastructure   |

## Agent Selection Rules

- Database changes → database
- Architecture decisions → architect
- Dashboard screens → frontend
- JSON rendering → ui-editor
- Publishing and URLs → publisher
- Tracking → analytics
- Testing → qa
- Deployment → devops

Use orchestrator for cross-agent work.

## Workflow

1. Read project documentation.
2. Identify incomplete tasks.
3. Check task dependencies.
4. Assign a primary agent.
5. Delegate independent tasks in parallel.
6. Review implementation.
7. Execute tests.
8. Update TASKS.md.
9. Update project_summary.md.

## Documentation Rules

After completing a verified task:

- Mark its status in TASKS.md.
- Record changes in project_summary.md.
- Update architecture documents when required.
- Update API contracts when required.
- Update the data model when schema changes.

## Security Rules

- Enforce Supabase RLS.
- Validate user ownership.
- Never expose service-role credentials.
- Never execute untrusted user HTML or JavaScript.
- Validate all landing page configurations.

## Architecture Constraints

- Use Next.js App Router.
- Use Supabase as the backend.
- Use shared schema-driven rendering.
- Render public landing pages on demand with per-page cache tags (no full-site rebuilds).
- Use Vercel for hosting.
- Do not introduce Astro or AWS CloudFront in MVP.

## Completion Criteria

A task is completed only when:

- Implementation is finished.
- Relevant tests pass.
- Contracts remain consistent.
- Documentation is updated.
- No critical issues remain.
