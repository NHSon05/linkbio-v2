# LinkBio — Task Backlog

Statuses: `TODO`, `IN_PROGRESS`, `BLOCKED`, `DONE`. Owner is the responsible agent, not an assertion that work has begun.

## Done

| ID        | Task                                                                                                                                                                          | Evidence                                                                                                                                    |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| D-01      | Page config schema v1 in `src/lib/schemas/site.ts` (+ `schemaVersion`, `PageConfigSchema`); docs updated                                                                      | `tsc`, `eslint`, `next build` pass (2026-11-24)                                                                                             |
| DB-01..06 | Migrations in `supabase/migrations/2026112412*` (profiles, templates, pages/versions + `create_page`/`save_draft`, media/products/Storage, deployments/redirects/events, RLS) | Applied on local Postgres 18 with Supabase stubs; `supabase/tests/rls_test.sql` 40+ assertions pass and fail on injected leaks (2026-11-24) |
| ON-01     | `/onboarding` username claim (`src/app/(auth)/onboarding`, `UsernameSchema`); dashboard redirects there until a username exists                                               | `tsc`, `eslint`, `next build` pass; signed-out `/onboarding` → `/login`. Not tested end-to-end yet (migrations now on Supabase)             |
| F-02a     | Next.js 16 + Tailwind v4 + shadcn/ui scaffold, design tokens, fonts                                                                                                           | `next build`, `eslint`, `tsc` pass (2026-11-24)                                                                                             |
| FE-01a    | Auth pages (email + Google OAuth via Supabase), session proxy                                                                                                                 | Routes render; Google `redirect_uri` verified                                                                                               |
| FE-01b    | Dashboard UI at `/` on mock data (`src/components/dashboard/mock/`)                                                                                                           | Screenshots of home/bio/slug/products tabs                                                                                                  |

## Phase 0 — Decisions

| ID   | Priority | Owner  | Task                                                                     | Depends on | Acceptance                             |
| ---- | -------- | ------ | ------------------------------------------------------------------------ | ---------- | -------------------------------------- |
| D-02 | P0       | devops | Use pnpm only; drop `package-lock.json`; decide on `pnpm-workspace.yaml` | —          | Single lockfile; clean install + build |
| D-03 | P0       | devops | Supabase: Google redirect URI, Redirect URLs (local + prod)              | —          | Google login reaches `/` locally       |

## Phase 1 — Database

Done (see table above). Pushed to Supabase `link-bio-tree` (ufmapcififfzfmywivhm) on 2026-11-24.

## Phase 2 — Onboarding

ON-01 done (see table above).

## Phase 3 — Dashboard on real data

| ID    | Priority | Owner    | Task                                                                   | Depends on   | Acceptance                               |
| ----- | -------- | -------- | ---------------------------------------------------------------------- | ------------ | ---------------------------------------- |
| FE-02 | P0       | frontend | Server data layer `src/lib/pages.ts` (list pages, read draft)          | DB-03        | Only caller's pages returned             |
| FE-03 | P0       | frontend | Dashboard reads real pages; empty state + create page (template, slug) | FE-02        | Created page appears after refresh       |
| FE-04 | P0       | frontend | Save draft with `expectedRevision`; 409 conflict UI                    | FE-03        | Refresh keeps edits; stale save rejected |
| FE-05 | P1       | frontend | Image upload to Storage (replace blob URL in `image-field.tsx`)        | DB-04        | Uploaded image survives refresh          |
| FE-06 | P1       | frontend | Products CRUD persisted                                                | DB-04, FE-04 | Products survive refresh                 |
| FE-07 | P1       | frontend | Rename slug (writes `url_redirects`), delete page                      | DB-05, FE-03 | Old URL redirects; delete removes page   |

## Phase 4 — Renderer

| ID    | Priority | Owner     | Task                                                                    | Depends on | Acceptance                          |
| ----- | -------- | --------- | ----------------------------------------------------------------------- | ---------- | ----------------------------------- |
| UI-01 | P0       | ui-editor | Block registry + renderer in `src/lib/renderer` (replace `MockBioPage`) | D-01       | Renders all block types; unit tests |
| UI-02 | P0       | ui-editor | Same renderer for preview and public page; snapshot tests               | UI-01      | Preview matches public output       |

## Phase 5 — Publishing

| ID     | Priority | Owner     | Task                                                          | Depends on    | Acceptance                              |
| ------ | -------- | --------- | ------------------------------------------------------------- | ------------- | --------------------------------------- |
| PUB-01 | P0       | publisher | Publish action: freeze version, set `desired_version_id`      | FE-04         | Idempotent; published version immutable |
| PUB-02 | P0       | publisher | `/[username]/[slug]` static from live version; 404 otherwise  | PUB-01, UI-02 | Two users, same slug → distinct pages   |
| PUB-03 | P0       | publisher | Vercel deploy hook, build status badge, callback, hourly cron | PUB-02        | Failed deploy keeps previous live page  |

## Phase 6 — Analytics

| ID    | Priority | Owner     | Task                                                        | Depends on    | Acceptance                  |
| ----- | -------- | --------- | ----------------------------------------------------------- | ------------- | --------------------------- |
| AN-01 | P1       | analytics | `POST /api/v1/events` + rate limit; tracking on public page | DB-05, PUB-02 | Events map to correct page  |
| AN-02 | P1       | analytics | Home chart/metrics from aggregates (replace `mockTraffic`)  | AN-01         | Per-page aggregates correct |

## Phase 7 — QA & CI

| ID     | Priority | Owner  | Task                                                             | Depends on | Acceptance  |
| ------ | -------- | ------ | ---------------------------------------------------------------- | ---------- | ----------- |
| QA-01  | P0       | qa     | Playwright: login → create → edit → publish; two users same slug | PUB-02     | Tests green |
| OPS-01 | P1       | devops | CI: lint, typecheck, build, tests                                | —          | CI passes   |

## Sprints

One-week sprints, one developer. Each sprint depends on the previous one. Status lives in the phase tables above.

| Sprint | Goal                                                                             | Tasks                                                    | Demo / exit                                                                     |
| ------ | -------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 1      | Dashboard on real data: sign up → username → create page → edit → save → refresh | ON-01 e2e check, D-02, D-03, OPS-01, FE-02, FE-03, FE-04 | Two accounts both create `tech-review`, edit differently, each sees only theirs |
| 2      | Real renderer in preview; images and products persisted                          | UI-01, UI-02 (preview), FE-05, FE-06                     | Preview uses `src/lib/renderer`; uploads and products survive refresh           |
| 3      | Publishing: "Xuất bản" → live at `/{username}/{slug}`                            | PUB-01, PUB-02 + UI-02 (public page), PUB-03, FE-07      | `/son/tech-review` ≠ `/tien/tech-review`; failed deploy keeps old version       |
| 4      | Analytics, end-to-end tests, release                                             | AN-01, AN-02, QA-01, responsive/a11y check, prod deploy  | `docs/plan.md` definition of done met                                           |

Sprint 2 starts with a decision for FE-06: products live in `config.catalog` today, but the database also has `products`/`page_products`. Pick one source of truth.

## Handoff checklist

Changed files; schema/API changes; migrations; commands executed and results; screenshots if UI; tests; risks; next dependencies. Avoid simultaneous edits to shared files without orchestrator approval.
