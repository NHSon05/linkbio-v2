# Sprint Plan v2 — Reconciled (2026-11-26)

Merges the Eosoft Linktree v2 proposal (`docs/v2-proposal/plan-v2.md`) with what this repository has already built and verified (see `docs/TASKS.md` "Done", CI run on `215835f`). Status: Sprint 5 started 2026-11-26 (V2-06 and V2-07 done, see `docs/TASKS.md`). Database and SSO work is gated on the open questions in §4.

## 1. Product decisions applied (2026-11-26)

1. **Routing:** move to a system-wide `/{slug}`, plus `/{slug}/{category}/{subcategory}` for the catalog. Creating a page suggests a slug (random suffix if taken); the user can change it later. Reserved names (`RESERVED_USERNAMES`, extended with every top-level app route) are rejected.
2. **Templates:** keep the current model, where content (JSON blocks) is separate from templates and themes. Users switch templates without losing content and change styles and blocks; one shared renderer (`BioPage`) serves both the preview and public pages. No user HTML, JS or CSS. "Import HTML/CSS templates" in v2 therefore means _a developer converts an approved design into a template_ (React + design tokens) at development time, not a runtime import.
3. **Audit first:** every v2 item is mapped to Keep / Change / New / Drop below before any migration.
4. **Catalog (Q8, approved 2026-11-27):**
   - **Source:** categories, subcategories and product assignments live in each Linktree's page config (`PageConfigSchema` → `catalog.categories`). They are saved with drafts and frozen in the published snapshot, like `catalog.products`. No live product data, and no tables.
   - **Depth:** fixed at 2 levels, `/{slug}/{category}` and `/{slug}/{category}/{subcategory}`.
   - **Product click:** opens the validated external affiliate URL directly; there is no product detail page.
   - **Consequence:** publish already refreshes every catalog route through the page's cache tag, so catalog invalidation (V2-32) is not needed.

## 2. Keep / Change / New / Drop

Legend: **Keep** = already done and verified here. **Change** = exists but must move from v1 to v2. **New** = not started. **Drop** = will not be built, or removed.

### 2.1 v2 roadmap items

| v2 ID | v2 task                                                                       | Verdict  | Current code / evidence                                                                                           | What remains                                                                  |
| ----- | ----------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 0.1   | Audit Eosoft backend, auth, schema, domains                                   | New      | —                                                                                                                 | Sprint 5, V2-02                                                               |
| 0.2   | SSO proof of concept                                                          | New      | Supabase Auth email + Google (FE-01a)                                                                             | Sprint 5, V2-03 (blocked on Q1–Q2)                                            |
| 0.3   | ISR/cache POC on Vercel                                                       | Change   | On-demand cache built: `'use cache'` + `cacheTag` + `updateTag` (PUB-02). Never measured on a deployed Vercel URL | Sprint 5, V2-04 measures it remotely                                          |
| 0.4   | HTML import / GrapesJS vs schema POC                                          | Drop     | Decision 2: constrained JSON schema already chosen and built (D-01, UI-01..04)                                    | Record the decision in an ADR (V2-01)                                         |
| 0.5   | Approve architecture decisions                                                | Change   | ARCHITECTURE.md reflects v1 + on-demand publishing                                                                | V2-01 ADR, after the answers in §4                                            |
| 1.1   | Repo + CI                                                                     | Keep     | CI: lint, typecheck, Vitest, build, E2E on local Supabase, RLS suite (OPS-01, OPS-01b, QA-01)                     | Preview deployment not verified → V2-05                                       |
| 1.2   | Additive migrations: linktrees, members, versions, `social_pages.linktree_id` | Change   | `pages` + `page_versions` (immutable versions, draft/live pointers) exist; ownership is `pages.owner_id`          | V2-10/V2-11 (members), V2-21 (`social_pages`)                                 |
| 1.3   | Shared auth and authorization                                                 | Change   | RLS + owner checks in every RPC (DB-06, 40+ assertions)                                                           | Switch ownership to membership (V2-11); SSO (V2-20)                           |
| 1.4   | Eosoft navigation deep link                                                   | New      | —                                                                                                                 | V2-22                                                                         |
| 2.1   | CRUD + slug reservation, 404 for absent slug                                  | Change   | Create/rename/delete (FE-03, FE-07), reserved usernames, real 404 (2026-11-26). Slug unique **per owner**         | Global slug + suggestion (V2-12, V2-13)                                       |
| 2.2   | Social page association                                                       | New      | —                                                                                                                 | V2-21 (blocked on Q3)                                                         |
| 2.3   | Template gallery + draft versions                                             | Keep     | Template gallery, starters (UI-03), `save_draft` with revision, immutable published snapshot (PUB-01)             | —                                                                             |
| 3.1   | Import approved HTML/CSS templates                                            | Change   | 3 templates as code (`src/templates`)                                                                             | Developer workflow to add an approved template (V2-07), no runtime import     |
| 3.2   | Visual editor + theme controls                                                | Change   | Text, links, images, ordering, colours, font, radius, visibility, pin, template switch                            | Add font size, spacing, width (V2-06)                                         |
| 3.3   | Shared preview/public rendering                                               | Keep     | `BioPage` used by preview and public page; container queries for mobile/desktop (UI-02); snapshots                | —                                                                             |
| 3.4   | Publish transaction                                                           | Keep     | `publish_page(page_id, expected_revision)`, idempotent, row lock (PUB-01)                                         | Invalidation intent row when the outbox exists (V2-23)                        |
| 4.1   | Public slug lookup + cache, real 404                                          | Change   | Done for `/{username}/{slug}`; 404 from `src/proxy.ts`                                                            | Move to `/{slug}` (V2-14)                                                     |
| 4.2   | Event-driven invalidation (authenticated, idempotent, retry)                  | New      | Only in-app `updateTag` from server actions                                                                       | V2-23 (needed once Eosoft writes)                                             |
| 4.3   | Rename handling, old/new slug, cached 404                                     | Change   | `rename_page` + `url_redirects` + `updateTag` on old/new path                                                     | Old `/{username}/{slug}` → `/{slug}` redirects (V2-14); catalog paths (V2-32) |
| 4.4   | Deployment cache verification                                                 | New      | Known risk: cache starts empty after a deploy (ARCHITECTURE §9)                                                   | V2-04                                                                         |
| 4.5   | Remote cache test script                                                      | New      | —                                                                                                                 | V2-04                                                                         |
| 5.1   | Category + product model                                                      | Change   | Products live in the page draft (`site.catalog`, FE-06); unused tables `products`/`page_products`                 | V2-30 (Q8: in the page config, depth 2)                                       |
| 5.2   | Catalog routes + UI                                                           | New      | —                                                                                                                 | V2-31                                                                         |
| 5.3   | Catalog invalidation                                                          | Drop     | —                                                                                                                 | Not needed (Q8: the catalog is part of the snapshot)                          |
| 6.1   | E2E on a real preview server                                                  | Change   | E2E in CI against local Supabase (QA-01)                                                                          | Remote preview run (V2-40)                                                    |
| 6.2   | Performance + security review                                                 | New      | Security rules followed per task; no full review                                                                  | V2-41                                                                         |
| 6.3   | Demo + production smoke tests, rollback runbook                               | New      | —                                                                                                                 | V2-42 (absorbs PUB-03)                                                        |
| 6.4   | MVP release gate                                                              | New      | —                                                                                                                 | V2-43                                                                         |
| 7.1   | GA4 instrumentation                                                           | Change   | Own events: `POST /api/v1/events`, `record_page_event` (AN-01)                                                    | Keep own events; GA4 only if asked (Q11)                                      |
| 7.2   | Analytics dashboard                                                           | Keep     | Home metrics + 30-day chart (AN-02)                                                                               | Slice by entry source (`utm_source` and referrer are already stored)          |
| 7.3   | Ranking automation                                                            | New (P1) | Pinning exists in the editor                                                                                      | After MVP                                                                     |

### 2.2 v1 items not in v2

| v1 item                                          | Verdict             | Reason                                                                           |
| ------------------------------------------------ | ------------------- | -------------------------------------------------------------------------------- |
| `/{username}/{slug}` URLs                        | Drop after redirect | Replaced by `/{slug}`; old URLs redirect (308) for a period set by Q6            |
| Username onboarding (ON-01)                      | Change              | Username leaves the URL; keep it as a display handle or remove it with SSO (Q10) |
| Deploy per publish + hourly cron (v1 plan P3/P5) | Drop                | Already replaced by on-demand publishing (2026-11-25)                            |
| `deployments` table                              | Drop                | Unused by the app since on-demand publishing                                     |
| `products` / `page_products` tables              | Drop                | Unused; Q8 keeps the catalog in the page config (drop in a later migration)      |
| In-memory rate limit on `/api/v1/events`         | Change              | Per instance only; move to Vercel Firewall (V2-41)                               |
| Email + Google login                             | Keep or drop        | Q10                                                                              |

## 3. Sprint breakdown

Day-sized sub-tasks (V2-01a, V2-11b, …) with files, checks and status live in `docs/TASKS.md` → "v2 sub-tasks".

One-week sprints, one developer, continuing from Sprints 1–4. Owner = responsible subagent (`.claude/agents/*`). **Gate** = cannot start until the listed question in §4 is answered.

**Approved 2026-11-26:** `pages` keeps its name and becomes the Linktree table; membership is added beside it (V2-10).

### Sprint 5 — Audit, measurement, no schema change

| ID    | Owner           | Task                                                                                                                                          | Depends on        | Acceptance                                                                                  |
| ----- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------- |
| V2-01 | architect       | ADR: v2 target (global slug, membership, keep JSON renderer, drop GrapesJS, catalog route depth); update ARCHITECTURE §2/§5/§10 once approved | §4 answers        | Mentor approves; ARCHITECTURE, data-model and AGENTS invariants match                       |
| V2-02 | orchestrator    | Eosoft audit with Hoàng: auth, company/user tables, `social_pages`, domains, who writes what                                                  | —                 | `docs/eosoft-audit.md` written; no production changes                                       |
| V2-03 | frontend (auth) | SSO proof of concept on a branch with local Supabase                                                                                          | V2-02, gate Q1–Q2 | Same verified company identity in both apps; unauthorized account denied; no tokens in URLs |
| V2-04 | devops (cache)  | Remote cache script (`scripts/cache-check.mjs`): cold → warm → publish → fresh → rename → old path → 404, across a redeploy                   | V2-05             | Records status, `x-vercel-cache`, content revision, latency, region; results in TASKS       |
| V2-05 | devops          | Staging: separate Supabase project + Vercel preview env (`SUPABASE_SECRET_KEY` included); fixtures only there                                 | Q12               | Preview URL serves a published fixture page; production untouched                           |
| V2-06 | ui-editor       | Theme controls: font size, spacing, content width (validated ranges in `ThemeSchema`)                                                         | —                 | Vitest for ranges; preview = public snapshot; switching template keeps all blocks (test)    |
| V2-07 | ui-editor       | Template authoring guide: how a developer converts an approved design into `src/templates/*`                                                  | —                 | One doc; a new template passes renderer snapshot tests                                      |

### Sprint 6 — Membership and global slug (gate: Q5–Q7)

| ID    | Owner                | Task                                                                                                                                                             | Depends on | Acceptance                                                                                       |
| ----- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------ |
| V2-10 | architect + database | Data model v2: `linktree_members (page_id, user_id, role)`; `pages` stays the Linktree table (no rename); global slug column; rollback plan                      | V2-01      | `docs/data-model.md` updated and approved                                                        |
| V2-11 | database             | Migration A (additive): members table, backfill owner as `owner`, membership helper, every RPC and RLS policy switched from `owner_id` to membership             | V2-10      | RLS suite: editor can save, only allowed roles publish/delete, non-member denied, anon unchanged |
| V2-12 | database             | Migration B: globally unique slug (lower-case, reserved check in SQL); backfill duplicates with a suffix; `url_redirects` from `/{username}/{slug}` to `/{slug}` | V2-11      | Collision backfill tested on a copy; old paths resolve to the new ones                           |
| V2-13 | frontend             | Create page with a suggested slug (`slug_available` RPC, random suffix), editable; rename uses the same check                                                    | V2-12      | Unit tests for suggestion; reserved and taken slugs rejected server-side                         |
| V2-14 | publisher            | Public route `(public)/[slug]`; old two-segment URLs 308 to the new path; proxy 404 check and cache tags by page id                                              | V2-12      | E2E: new URL 200, old URL 308 → 200, unknown 404; reserved names never reach the page            |
| V2-15 | qa                   | Update E2E + RLS suite for membership and global slug                                                                                                            | V2-11..14  | CI green                                                                                         |

### Sprint 7 — SSO and Eosoft integration (gate: Q1–Q4)

| ID    | Owner             | Task                                                                                                    | Depends on   | Acceptance                                                                      |
| ----- | ----------------- | ------------------------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------- |
| V2-20 | frontend (auth)   | Production SSO from the V2-03 POC; identity mapping to `profiles` / members                             | V2-03, V2-11 | Cross-company denial tested; session checks server-side                         |
| V2-21 | database          | `social_pages.linktree_id` (nullable FK, `on delete set null`) in the shared schema                     | V2-02, Q3    | Several social pages → one Linktree; unlink keeps the Linktree                  |
| V2-22 | frontend          | Deep link from Eosoft to `/admin/linktrees/{id}/edit` (maps to the editor by page id)                   | V2-20        | Authorized users land in the editor; others get 403/404; no tokens in URLs      |
| V2-23 | publisher (cache) | Invalidation for writes outside this app: outbox table + signed `/api/revalidate` (idempotent, retried) | V2-14, Q5    | A write from a simulated Eosoft writer is visible within the agreed window (Q9) |

### Sprint 8 — Catalog (gate: Q8, approved 2026-11-27)

| ID    | Owner               | Task                                                                                       | Depends on   | Acceptance                                                     |
| ----- | ------------------- | ------------------------------------------------------------------------------------------ | ------------ | -------------------------------------------------------------- |
| V2-30 | catalog             | Categories (Linktree-scoped, max depth 2) and product links in the page config (Q8)        | V2-11        | Schema tests: depth, slugs, parent scope, product references   |
| V2-31 | renderer + frontend | Routes `/{slug}/{category}` and `/{slug}/{category}/{subcategory}`; breadcrumbs; editor UI | V2-30, V2-14 | E2E: deep link, reload, Back/Forward, 404 for unknown category |
| V2-32 | publisher (cache)   | DROPPED (Q8): the catalog is part of the published snapshot, so publish covers it          | —            | —                                                              |

### Sprint 9 — Release

| ID    | Owner         | Task                                                                                       | Depends on         | Acceptance                                                               |
| ----- | ------------- | ------------------------------------------------------------------------------------------ | ------------------ | ------------------------------------------------------------------------ |
| V2-40 | qa            | E2E against the staging preview (in addition to local CI)                                  | V2-05, Sprints 6–8 | Auth, RLS, CRUD, publish, catalog, cache pass remotely                   |
| V2-41 | qa + reviewer | Security + performance review; move event rate limit to Vercel Firewall                    | V2-40              | No cross-tenant access, no private data in public HTML, latency recorded |
| V2-42 | devops        | Demo, read-only production smoke test, rollback runbook, error monitoring (absorbs PUB-03) | V2-41              | Runbook in docs; smoke results recorded                                  |
| V2-43 | orchestrator  | MVP release gate                                                                           | V2-42              | All P0 criteria verified; mentor approval                                |

Post-MVP: GA4 (only if Q11 says so), ranking automation (v2 7.3), and slicing analytics by entry source.

## 4. Open questions (must be answered before database or SSO work)

**For Hoàng (Eosoft):** answered 2026-11-26 (Q5 is a working assumption). See `docs/eosoft-audit.md`; the resulting data proposal is in `docs/data-model.md` → "v2: Eosoft coexistence".

1. Which SSO / identity provider does Eosoft use (Supabase Auth in the same project, OIDC, SAML, other), and what are the allowed callback URLs and domains for admin and public pages?
2. Is "shared Supabase" literally Eosoft's existing project? If so, who owns migrations there, and may we add tables (`linktree_members`, outbox) and RLS policies?
3. What is the exact `social_pages` table (primary key type, owner/company column), and who writes `linktree_id`: Eosoft or this app?
4. How do company, user and role map: is the tenant the company (all staff can edit) or the individual user?
5. Will Eosoft's backend write Linktree or catalog data directly to the database, or only through this app? (This decides whether V2-23 is needed for MVP.)

**For the mentor:**

6. Global slug rules: allowed characters and length (reuse the username rule `^[a-z0-9][a-z0-9-]{2,29}$`?), and how long old `/{username}/{slug}` URLs keep redirecting.
7. Member roles: which roles exist, and who may publish, rename and delete?
8. Catalog source: products stored per Linktree in the published snapshot (current model, simplest caching) or live Eosoft product data? Is depth fixed at two levels, and is a product detail page needed? **Answered 2026-11-27: in the page config and published snapshot; depth fixed at 2; no detail page, products open the affiliate URL (§1.4).**
9. Acceptable delay between publish (or an Eosoft-side change) and the public page updating.
10. After SSO: keep email/Google sign-in, and migrate existing accounts and pages, or start fresh?
11. Analytics: keep the built-in events (already live) or also add GA4, and is a consent banner required?
12. Vercel plan (Firewall rate limits, Schedules) and approval for a separate staging Supabase project.
