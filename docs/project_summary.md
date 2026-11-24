# LinkBio — Project Summary

## Project status

**State:** Planning / specification. No production implementation or deployed Supabase database is implied by these documents.

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

- 2026-11-24 — Initial architecture, data model, plan, API contract, task list, and subagent instructions drafted. No code execution or migrations claimed.
