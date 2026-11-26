# LinkBio — Project Summary

## Project status

**State (2026-11-26):** v1 is built and merged: auth, dashboard on real data, editor, renderer, on-demand publishing at `/{username}/{slug}` with a real 404, analytics, and CI with E2E on local Supabase. The plan of record is now v2 (`plan.md`, `sprint-plan-v2.md`). Sprint 5 is in progress; database and SSO work waits for the open questions Q1–Q12.

## Vision

An Eosoft Linktree: companies build Linktree pages from templates, publish them at a system-wide `/{slug}` with a catalog, link them from Eosoft Social Pages, and see views and clicks.

## Decisions

- Next.js App Router + TypeScript + Tailwind CSS v4 + shadcn/ui; Supabase (Postgres, Auth, Storage) with RLS; Vercel.
- JSONB page versions, Zod validation, one shared renderer for preview and public pages; content is separate from templates, so switching template keeps it.
- No user HTML/JS/CSS and no GrapesJS; developers convert approved designs (`template-authoring.md`).
- On-demand rendering with per-page cache tags; no full-site rebuilds; no Astro, CloudFront or build workers.
- v2 (approved 2026-11-26): system-wide `/{slug}` with suggested, editable slugs; `pages` stays the Linktree table, with members added beside it.

## Core success criterion

Two companies publish two different Linktrees from the same template at `/{slug}` addresses, edit them independently, and neither can see or change the other's drafts or data.

## Key risks / open decisions

See the open questions (SSO provider, shared Supabase ownership, slug rules, roles, catalog source, stale window, analytics) and risks in `sprint-plan-v2.md` and `plan.md`.

## Working agreement

Update this file after each completed task: date, task ID, changed files, verification performed, known limitations, and next task. Never mark a task complete solely because code was written.

## Change log

- 2026-11-26: Approved option A (schema `linktree`) and the role matrix. V2-10b is written: migration `20261126090000_linktree_schema.sql` moves our tables and functions out of `public`/`private` (re-creating function bodies with `linktree.` names, renaming the sign-up trigger), and the app's Supabase clients use `DB_SCHEMA`. Verified: RLS suite with 5 new isolation checks on local Postgres, 48 Vitest tests, lint and typecheck. Not yet: CI with real Supabase and E2E, and Staging (needs the schema exposed in the Dashboard first). The storage bucket rename is a separate task (V2-10c).

- 2026-11-26: V2-13a done. `src/lib/slug.ts` suggests a global slug from a title (Vietnamese accents removed, 3–30 chars, reserved names avoided, random 4-character suffix when needed); 6 tests; 48 tests total pass; lint and typecheck clean.

- 2026-11-26: Eosoft audit answers recorded (`eosoft-audit.md`). Eosoft's `public` schema already has `profiles`, `sites`, `site_members`, `site_versions`, `slug_redirects`, `site_traffic`, `builds`. Our current project is Staging/Demo; production will be Eosoft's project (Supabase Auth + Google). Tenant = company, five roles. Proposal in `data-model.md`: move our tables into schema `linktree` to avoid collisions, company membership, and a role matrix. All of this awaits approval. V2-23 deferred (Q5). `TASKS.md` sub-tasks updated.

- 2026-11-26: Sprint 5 audit and measurement. V2-02a: `docs/eosoft-audit.md` questionnaire for Hoàng (Q1–Q5, schema-only exports, no secrets), not sent yet. V2-04a: `scripts/cache-check.mjs <baseUrl> <path> [--steps publish,rename,redeploy]` (GET only) records status, `x-vercel-cache`, age, region, latency and a visible-text content hash. Verified locally: 404 for unknown paths, stable warm hash, failing exit code for a missing page. The interactive steps are not run yet.

- 2026-11-26: v2 is the plan of record. `docs/plan.md` now holds the v2 roadmap (v1 kept in git history); `AGENTS.md` invariants and the agent prompts (`architect`, `orchestrator`, `publisher`, `.claude/agents/AGENTS.md`) point to v2 (`/{slug}` target, on-demand rendering, no GrapesJS). `TASKS.md` adds day-sized v2 sub-tasks with owners, files, checks and status; startable now: V2-02a, V2-04a, V2-13a.

- 2026-11-26: Sprint 5 started on `feat/v2-sprint-5`. V2-06: font size, spacing and content-width steps in Design, applied by `BioPage` through the design-token variables (5 new tests, snapshots unchanged, screenshots checked). V2-07: `docs/template-authoring.md`; the starter tests now read every migration. Approved: `pages` keeps its name. Checks: lint, typecheck, 42 tests, build.

- 2026-11-26: v2 planning (no code). Reconciled `docs/plan.html` (Eosoft Linktree v2) with the built work in `docs/sprint-plan-v2.md`: Keep/Change/New/Drop for every v2 item, Sprints 5–9 (V2-01..43), and 12 open questions for Hoàng and the mentor. Decisions: system-wide `/{slug}` with suggested slugs; keep the JSON block/template model and one renderer (no user HTML, GrapesJS dropped). `TASKS.md` gets a v2 backlog section; history unchanged.

- 2026-11-26: Real 404 for missing public pages. With Cache Components the page streams its shell first, which fixes the status at 200, so `src/proxy.ts` now checks `/{username}/{slug}` before rendering (`src/lib/publishing/exists.ts`, using the anon `get_published_page` RPC and asking only for `redirect_to`) and rewrites missing pages to the not-found page with status 404. Found pages are remembered per instance for 60 s, so a public view usually skips the database. If Supabase errors, the request goes through. Verified locally against the live Supabase: unknown paths 404, app routes 200. 5 unit tests added; E2E now asserts status codes (runs in CI).

- 2026-11-25: Phase 7 (QA & CI). QA-01 adds Playwright E2E tests (`e2e/`, `playwright.config.ts`, `@playwright/test` 1.65.0) and a CI `e2e` job on a throwaway local Supabase that also runs `supabase/tests/rls_test.sql`. Adds `supabase/config.toml` (from `supabase init`), and third-party actions are pinned to SHAs. The E2E run found the bottom-right toasts covering the save/publish bar, so toasts now show at the top. Verified in CI run on `215835f`: all jobs green.

- 2026-11-25: Phase 6 (Analytics). AN-01 adds the events endpoint, public-page tracking and the `record_page_event` RPC (secret key only). AN-02 builds the Home metrics and chart from `page_traffic` and removes the mock traffic. Migration `20261125120000_analytics.sql` was pushed to Supabase on 2026-11-25. Checked live: anonymous visitors cannot record events or read traffic, and the local route reaches Supabase with the secret key. Still open: `SUPABASE_SECRET_KEY` in Vercel and a real view/click end to end. Verified: lint, typecheck, 29 tests, build, RLS suite (11 new assertions), local endpoint status codes. The renderer snapshots changed only by adding `data-block-id`, which I checked.

- 2026-11-25: Phase 5 started with PUB-01 and PUB-02, using on-demand publishing (decision 2026-11-25; ARCHITECTURE §2/§6/§9 updated). Adds migration `20261125110000_publishing.sql` (`publish_page`, `get_published_page`). The public route renders the live snapshot with `BioPage`, and the dashboard's "Xuất bản" is enabled. Verified: lint, typecheck, 26 tests, build, RLS suite (10 new assertions) on local Postgres. The migration was pushed to Supabase on 2026-11-25. Checked live: anonymous visitors cannot publish or read tables, and an unknown public path shows the 404 page but with HTTP 200 (soft 404, open). Not yet done: a signed-in publish end to end.

- 2026-11-25: Phase 4 (Renderer) finished. UI-02 adds the template desktop layouts through container queries and shows the desktop-only intro. Added render and snapshot tests in `src/lib/renderer/BioPage.test.tsx`, plus a `.tsx` include in the Vitest config. Verified: lint, typecheck, 26 tests, build, phone and desktop screenshots.

- 2026-11-25: Phase 3 finished in code. FE-05 adds image upload to Storage (the server checks file content). FE-06 keeps products in the page draft and drops the sample products. FE-07 adds rename slug with redirects for published pages, plus delete page. Verified: lint, typecheck, 19 tests, build, RLS suite on local Postgres, screenshot. Not verified against live Supabase. Migrations `20261125090000` and `20261125100000` were pushed to Supabase `link-bio-tree` on 2026-11-25 and checked over REST.

- 2026-11-25: Template editor. Adds the renderer (UI-01), template starter content (UI-03 migration, not yet pushed) and a form-based block editor with a live preview (UI-04). v1 block types are link, card, banner, video and shop. Verified with lint, typecheck, 17 tests, build and screenshots. Not verified against live Supabase data.

- 2026-11-24 — Sprint 1: D-02 (pnpm only), OPS-01 (GitHub Actions CI + Vitest, 14 tests), FE-02..04 (dashboard reads/creates/saves real pages via `create_page`/`save_draft`). Verified: lint, typecheck, tests, build, screenshots with sample props. Not verified: live sign-in → create → save against Supabase; D-03 pending (Supabase dashboard).

- 2026-11-24 — Migrations 20261124120000..120500 pushed to `link-bio-tree` (ufmapcififfzfmywivhm). Verified via REST with the anon key: 3 templates readable; pages, page_versions, products, page_events, deployments return 42501; `create_page` denied for anon. Full `rls_test.sql` not run against production.

- 2026-11-24 — ON-01: `/onboarding` username claim; dashboard redirects there until `profiles.username` is set. Verified: tsc, eslint, build, signed-out redirect. Migration push to `ufmapcififfzfmywivhm` blocked: the logged-in Supabase CLI account lacks access.

- 2026-11-24 — DB-01..06: six migrations + RLS test script. Verified on a local Postgres 18 with Supabase auth/storage stubs (Docker was unavailable): all migrations apply, all RLS assertions pass, and the suite fails when a leak is injected. Not yet run on real Supabase (Postgres 17) nor pushed to the hosted project.

- 2026-11-24 — D-01: page config schema v1 = `src/lib/schemas/site.ts` (from bio-link). Added `schemaVersion`, `PageConfigSchema` (stored shape, no slug). Updated API_Contract and data-model. Verified: `tsc`, `eslint`, `next build`. Not verified: runtime parse test (tsx not installed).
- 2026-11-24 — F-02a/FE-01a/FE-01b: shadcn UI + design tokens, Supabase auth (email + Google), dashboard UI at `/` on mock data. Verified by build and screenshots; real Google login not tested end-to-end.

- 2026-11-24 — Initial architecture, data model, plan, API contract, task list, and subagent instructions drafted. No code execution or migrations claimed.
- 2026-11-24 — DOC-01. Added `/orchestrate`, project orchestration rules, and the default Claude Code agent in `.claude/`. Validated the command and settings, all nine agent routes, and all 13 backlog owners. Live delegation remains untested. The first implementation task is F-01.
- 2026-11-24 — DOC-01. Configured six stage commands and four rules in `.claude/`. Verified project command registration in Claude Code, Markdown formatting, and agent routing. Live command execution remains untested. The first implementation task is F-01.
