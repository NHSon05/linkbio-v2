# LinkBio — Implementation Plan (v2)

Plan of record since 2026-11-26. It replaces the v1 roadmap (standalone app, `/{username}/{slug}`, deploy per publish), which is kept in git history; v1 Sprints 1–4 are done (`TASKS.md`). Detail, the Keep/Change/New/Drop audit and open questions: `sprint-plan-v2.md`. Source proposal: `v2-proposal/plan-v2.md`.

## Goal

An Eosoft Linktree: companies sign in with their Eosoft identity, build Linktree pages from templates (content stays when the template changes), publish them at `/{slug}`, link them from Eosoft Social Pages, and browse a catalog at `/{slug}/{category}/{subcategory}`. Public pages are cached and refreshed within seconds of a publish, with no full-site rebuild.

## Decisions

| Area       | Decision                                                                                                                                                                                                      | Status                                       |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Public URL | System-wide `/{slug}`; suggested slug with random suffix when taken; editable; reserved names rejected; old `/{username}/{slug}` URLs redirect                                                                | Approved; rules pending (Q6)                 |
| Tenancy    | Company is the tenant (one company per user; roles super_admin/owner/admin/editor/viewer); `pages` stays the Linktree table, gains `company_id`; our tables move to schema `linktree` to avoid Eosoft's names | Answered (Q4); data proposal awaits approval |
| Templates  | JSON blocks + templates + one shared renderer; developers convert approved designs (`template-authoring.md`); no user HTML/JS/CSS; no GrapesJS                                                                | Approved                                     |
| Rendering  | On-demand: cached per page (`'use cache'` + `cacheTag`), refreshed by `updateTag`; real 404 from the proxy                                                                                                    | Built                                        |
| Identity   | Supabase Auth + Google, as Eosoft uses; current project = Staging, production = Eosoft's project; company-email allowlist later                                                                               | Answered (Q1–Q2)                             |
| Catalog    | Source and depth                                                                                                                                                                                              | Pending (Q8)                                 |
| Analytics  | Built-in events (built); GA4 only if requested                                                                                                                                                                | Pending (Q11)                                |

## Sprints

| Sprint | Goal                                                 | Exit criteria                                                                                                | Gate                               |
| ------ | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------- |
| 5      | Audit, measurement, editor polish (no schema change) | Eosoft audit written; remote cache numbers recorded; theme steps and template guide done                     | V2-03 needs Q1–Q2, V2-05 needs Q12 |
| 6      | Membership + global `/{slug}`                        | Two users cannot take the same slug; members edit per role; old URLs redirect; RLS suite green               | Q5–Q7                              |
| 7      | SSO + Eosoft integration                             | Eosoft identity signs in; social page links to a Linktree; Eosoft-side changes show within the agreed window | Q1–Q5, Q9                          |
| 8      | Catalog                                              | Category routes work with deep links, reload and Back/Forward; 404 for unknown categories                    | Q8                                 |
| 9      | Release                                              | E2E on staging, security review, read-only production smoke test, mentor sign-off                            | Sprints 6–8                        |

## MVP user journeys

1. Sign in with an Eosoft identity; land in the editor of a Linktree the company can access.
2. Create a Linktree: pick a template, accept or edit the suggested slug.
3. Edit content and theme (colours, font, size, spacing, width, radius, block order); save; reload keeps it.
4. Switch template; content stays.
5. Publish; `/{slug}` shows it within seconds; saved-but-unpublished edits stay private.
6. Rename the slug; the old URL redirects; an unknown slug answers 404.
7. Open a category and subcategory from the Linktree; Back/Forward and deep links work.
8. A Social Page in Eosoft links to the Linktree.

## Definition of done

Typecheck, lint, unit tests, RLS negative tests, Playwright journey in CI and on staging, remote cache script results, responsive and accessibility check, docs updated, and evidence recorded in `TASKS.md`.

## Risks

- Shared Supabase: migrations owned by two repositories; agree one owner (Q2).
- Global slug migration: existing duplicate slugs need suffixes and redirects.
- Writes from Eosoft bypass `updateTag`; needs an outbox and signed refresh (V2-23).
- Cache starts empty after a deploy; first visits read Supabase (V2-04 measures it).
- Per-instance rate limits; move to Vercel Firewall before launch (V2-41).
