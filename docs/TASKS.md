# LinkBio — Task Backlog

Statuses: `TODO`, `IN_PROGRESS`, `BLOCKED`, `DONE`. Owner is the responsible agent, not an assertion that work has begun.

## Done

| ID        | Task                                                                                                                                                                          | Evidence                                                                                                                                    |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| D-01      | Page config schema v1 in `src/lib/schemas/site.ts` (+ `schemaVersion`, `PageConfigSchema`); docs updated                                                                      | `tsc`, `eslint`, `next build` pass (2026-11-24)                                                                                             |
| DB-01..06 | Migrations in `supabase/migrations/2026112412*` (profiles, templates, pages/versions + `create_page`/`save_draft`, media/products/Storage, deployments/redirects/events, RLS) | Applied on local Postgres 18 with Supabase stubs; `supabase/tests/rls_test.sql` 40+ assertions pass and fail on injected leaks (2026-11-24) |
| ON-01     | `/onboarding` username claim (`src/app/(auth)/onboarding`, `UsernameSchema`); dashboard redirects there until a username exists                                               | `tsc`, `eslint`, `next build` pass; signed-out `/onboarding` → `/login`. Not tested end-to-end: migrations not yet on Supabase              |
| F-02a     | Next.js 16 + Tailwind v4 + shadcn/ui scaffold, design tokens, fonts                                                                                                           | `next build`, `eslint`, `tsc` pass (2026-11-24)                                                                                             |
| FE-01a    | Auth pages (email + Google OAuth via Supabase), session proxy                                                                                                                 | Routes render; Google `redirect_uri` verified                                                                                               |
| FE-01b    | Dashboard UI at `/` on mock data (`src/components/dashboard/mock/`)                                                                                                           | Screenshots of home/bio/slug/products tabs                                                                                                  |

## Phase 0 — Decisions

| ID   | Priority | Owner  | Task                                                                     | Depends on | Acceptance                             |
| ---- | -------- | ------ | ------------------------------------------------------------------------ | ---------- | -------------------------------------- |
| D-02 | P0       | devops | Use pnpm only; drop `package-lock.json`; decide on `pnpm-workspace.yaml` | —          | Single lockfile; clean install + build |
| D-03 | P0       | devops | Supabase: Google redirect URI, Redirect URLs (local + prod)              | —          | Google login reaches `/` locally       |

## Phase 1 — Database

Done (see table above). Not yet applied to the hosted Supabase project.

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

## Order

Next: push migrations to Supabase (blocked: CLI account has no access to the project), D-02/D-03, then FE-02 and UI-01 in parallel. Phase 3 needs DB-01..03; Phase 5 needs Phase 3 + 4.

## Handoff checklist

Changed files; schema/API changes; migrations; commands executed and results; screenshots if UI; tests; risks; next dependencies. Avoid simultaneous edits to shared files without orchestrator approval.
