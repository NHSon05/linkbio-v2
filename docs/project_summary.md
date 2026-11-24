# LinkBio — Project Summary

## Project status

**State:** Early implementation. Auth and dashboard UI exist; dashboard runs on mock data. No migrations or deployed database yet.

## Vision

A multi-tenant link-in-bio builder: select a predefined template, customize blocks/design, publish a static landing page with a unique user-scoped URL, and monitor clicks/views.

## Finalized decisions

- Next.js App Router + TypeScript + Tailwind CSS v4 + shadcn/ui.
- Supabase Auth/PostgreSQL/Storage with RLS.
- JSONB page versions, Zod schema validation, shared renderer.
- URL `/{username}/{pageSlug}`; template key is not the unique public page identifier.
- Next.js static prerendering on Vercel; publish triggers deployment; hourly cron as fallback.
- No Astro, AWS CloudFront, custom worker, arbitrary HTML/CSS/JS or custom domain in MVP.

## Core success criterion

User `son` and user `tien` both select `tech-review`, save different configs, and publish `linkbio.example/son/tech-review` and `linkbio.example/tien/tech-review` with no cross-tenant data leakage.

## Scope

**Included:** Auth, template gallery, pages, visual editor, drafts, preview, publish, static public pages, basic analytics, deployment status.
**Deferred:** custom domains, fine-grained freeform HTML/CSS, advanced ranking, distributed incremental publishing, full marketing automation.

## Key risks / unresolved decisions

Deployment trigger and ready-callback implementation; hosting hostname; analytics privacy/consent; template font catalog; build duration at scale.

## Working agreement

Update this file after each completed task: date, task ID, changed files, verification performed, known limitations, and next task. Never mark a task complete solely because code was written.

## Change log

- 2026-11-24 — Sprint 1: D-02 (pnpm only), OPS-01 (GitHub Actions CI + Vitest, 14 tests), FE-02..04 (dashboard reads/creates/saves real pages via `create_page`/`save_draft`). Verified: lint, typecheck, tests, build, screenshots with sample props. Not verified: live sign-in → create → save against Supabase; D-03 pending (Supabase dashboard).

- 2026-11-24 — Migrations 20261124120000..120500 pushed to `link-bio-tree` (ufmapcififfzfmywivhm). Verified via REST with the anon key: 3 templates readable; pages, page_versions, products, page_events, deployments return 42501; `create_page` denied for anon. Full `rls_test.sql` not run against production.

- 2026-11-24 — ON-01: `/onboarding` username claim; dashboard redirects there until `profiles.username` is set. Verified: tsc, eslint, build, signed-out redirect. Migration push to `ufmapcififfzfmywivhm` blocked: the logged-in Supabase CLI account lacks access.

- 2026-11-24 — DB-01..06: six migrations + RLS test script. Verified on a local Postgres 18 with Supabase auth/storage stubs (Docker was unavailable): all migrations apply, all RLS assertions pass, and the suite fails when a leak is injected. Not yet run on real Supabase (Postgres 17) nor pushed to the hosted project.

- 2026-11-24 — D-01: page config schema v1 = `src/lib/schemas/site.ts` (from bio-link). Added `schemaVersion`, `PageConfigSchema` (stored shape, no slug). Updated API_Contract and data-model. Verified: `tsc`, `eslint`, `next build`. Not verified: runtime parse test (tsx not installed).
- 2026-11-24 — F-02a/FE-01a/FE-01b: shadcn UI + design tokens, Supabase auth (email + Google), dashboard UI at `/` on mock data. Verified by build and screenshots; real Google login not tested end-to-end.

- 2026-11-24 — Initial architecture, data model, plan, API contract, task list, and subagent instructions drafted. No code execution or migrations claimed.
- 2026-11-24 — DOC-01. Added `/orchestrate`, project orchestration rules, and the default Claude Code agent in `.claude/`. Validated the command and settings, all nine agent routes, and all 13 backlog owners. Live delegation remains untested. The first implementation task is F-01.
- 2026-11-24 — DOC-01. Configured six stage commands and four rules in `.claude/`. Verified project command registration in Claude Code, Markdown formatting, and agent routing. Live command execution remains untested. The first implementation task is F-01.
