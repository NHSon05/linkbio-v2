# Eosoft Linktree — Development Plan v2

Development plan v2 — 25/11/2026. Baseline đề xuất theo trao đổi mentor; chưa xác minh repository, backend hoặc triển khai thực tế. Mọi task ở trạng thái TODO.

## Architecture baseline

Hai frontend repo độc lập; Eosoft quản lý Social Pages và điều hướng sang admin mới. Shared Supabase và shared identity; không giả định session cookie dùng chung giữa domain. Next.js admin động; public routes on-demand ISR trên Vercel. Không Astro, CloudFront, cron rebuild toàn site hay build worker. Template HTML/CSS được import có kiểm soát; GrapesJS chỉ là ứng viên POC.

## Data & routing

Linktrees độc lập; social_pages.linktree_id là FK nullable, nhiều social pages trỏ một Linktree. Quyền qua linktree_members hoặc permission model hiện có. Slug toàn hệ thống là đề xuất cần xác nhận; page ID bất biến. Public routes /{slug}, /{slug}/{category}, /{slug}/{category}/{subcategory}. Draft riêng với published snapshot; không public dữ liệu nháp.

## Cache contract

Public cache không phụ thuộc session/cookie; chỉ cache dữ liệu published. Dùng cache tags theo Linktree ID và route dependencies, revalidatePath/revalidateTag theo phiên bản Next.js đã pin. Sau commit, mọi writer (kể cả Eosoft) phải phát invalidation event qua endpoint xác thực hoặc DB webhook/outbox có retry. Save draft không invalidate. Slug rename/delete/create xử lý cả negative cache và URL cũ/mới. Deploy code mới kiểm chứng renderer version và cache data; không giả định tự xóa mọi cache. ISR có thể trả STALE; thống nhất SLA và polling trước khi assert fresh, không ép MISS ngay nếu nền tảng dùng SWR.

## Security & testing

RLS, server-side permissions, verified company identity, no privileged keys in client, no tokens in URL. Sanitize HTML/CSS/URLs, sandbox preview, isolate public origin if needed. Test remote preview/staging with dedicated fixtures; production smoke tests read-only unless explicitly approved. Record HTTP status, x-vercel-cache if available, content version, latency and region; do not infer database query counts from headers alone.

## Open decisions / blockers

Hoàng: current SSO provider, identity mapping, OAuth callbacks and domains. Mentor: slug namespace, member roles, catalog source, template import scope, acceptable stale window. DevOps: Vercel plan and Next.js cache behavior. No implementation or test has been executed. Phase 0 gates production architecture.

## Agent coordination

Orchestrator owns plan/status; architect approves contracts; auth/database/frontend/ui-editor/renderer/cache/catalog/qa/devops implement scoped tasks. Analytics post-MVP. Parallelize only non-overlapping tasks after contracts; update project_summary.md and plan.md with evidence after verification. Status: TODO / IN PROGRESS / BLOCKED / DONE. DONE requires tests and reviewed acceptance criteria.

## Roadmap

### Phase 0 — Research & POC (P0)

Agents: architect, auth, cache, ui-editor

| ID  | Task                                           | Depends on | Acceptance criteria                                                                   | Status |
| --- | ---------------------------------------------- | ---------- | ------------------------------------------------------------------------------------- | ------ |
| 0.1 | Audit Eosoft backend, auth, schema and domains | —          | Document existing contracts with Hoàng; no production changes                         | TODO   |
| 0.2 | SSO proof of concept                           | 0.1        | Two apps resolve same verified company identity; unauthorized account denied          | TODO   |
| 0.3 | ISR/cache proof of concept on Vercel           | 0.1        | Cold/warm requests, update and invalidation verified with headers and content version | TODO   |
| 0.4 | HTML import and editor POC                     | —          | Compare GrapesJS vs constrained schema; preview/public parity and sanitization        | TODO   |
| 0.5 | Approve architecture decisions                 | 0.2–0.4    | Record Next.js version, cache freshness SLA, editor, domain and permissions           | TODO   |

### Phase 1 — Foundation & shared backend (P0)

Agents: database, auth, devops

| ID  | Task                                       | Depends on | Acceptance criteria                                                      | Status |
| --- | ------------------------------------------ | ---------- | ------------------------------------------------------------------------ | ------ |
| 1.1 | Initialize independent Next.js repo and CI | 0.5        | Lint, typecheck, unit tests and preview deployment                       | TODO   |
| 1.2 | Add additive Supabase migrations           | 0.5        | Linktrees, members, versions and social_pages.linktree_id; rollback plan | TODO   |
| 1.3 | Implement shared auth and authorization    | 1.2        | Verified company identity, server checks, RLS and cross-user denial      | TODO   |
| 1.4 | Integrate Eosoft navigation                | 1.3        | Authorized deep link to admin; no tokens in URLs                         | TODO   |

### Phase 2 — Linktree management (P0)

Agents: frontend, database

| ID  | Task                                | Depends on | Acceptance criteria                                                          | Status |
| --- | ----------------------------------- | ---------- | ---------------------------------------------------------------------------- | ------ |
| 2.1 | CRUD and slug reservation           | 1.2, 1.3   | Unique normalized slug, reserved routes rejected, 404 for absent public slug | TODO   |
| 2.2 | Social page association             | 2.1        | Multiple social pages reference one Linktree; unlink does not delete it      | TODO   |
| 2.3 | Template gallery and draft versions | 2.1        | Independent editable instance, immutable published snapshot                  | TODO   |

### Phase 3 — Editor & shared renderer (P0)

Agents: ui-editor, renderer

| ID  | Task                                        | Depends on | Acceptance criteria                                                               | Status |
| --- | ------------------------------------------- | ---------- | --------------------------------------------------------------------------------- | ------ |
| 3.1 | Import approved HTML/CSS templates          | 0.4, 2.3   | Versioned template, sanitized assets and isolated preview                         | TODO   |
| 3.2 | Visual editor and responsive theme controls | 3.1        | Text, links, images, font, size, radius, spacing, ordering; reload draft          | TODO   |
| 3.3 | Shared preview/public rendering             | 3.2        | Same render pipeline and version; mobile/desktop parity                           | TODO   |
| 3.4 | Publish transaction                         | 3.3        | Validate permissions and config; commit published version and invalidation intent | TODO   |

### Phase 4 — On-demand rendering & cache (P0)

Agents: cache, renderer, devops

| ID  | Task                                 | Depends on | Acceptance criteria                                                          | Status |
| --- | ------------------------------------ | ---------- | ---------------------------------------------------------------------------- | ------ |
| 4.1 | Public slug lookup and ISR           | 3.4        | No full-site build; cache public published content only; real 404            | TODO   |
| 4.2 | Event-driven invalidation            | 4.1        | Authenticated idempotent endpoint; retry failed invalidation after DB commit | TODO   |
| 4.3 | Route dependency and rename handling | 4.2        | Invalidate root, catalog, old/new slug and cached 404; redirects per policy  | TODO   |
| 4.4 | Deployment cache verification        | 4.2        | New renderer version visible; verify data cache behavior across deploys      | TODO   |
| 4.5 | Remote cache test script             | 4.3, 4.4   | Cold/warm/update/invalidate/fresh/warm; record headers, version and latency  | TODO   |

### Phase 5 — Catalog (P0)

Agents: catalog, database, renderer

| ID  | Task                       | Depends on | Acceptance criteria                                                    | Status |
| --- | -------------------------- | ---------- | ---------------------------------------------------------------------- | ------ |
| 5.1 | Category and product model | 1.2, 2.1   | Scoped categories, parent constraints, max depth, product associations | TODO   |
| 5.2 | Catalog routes and UI      | 5.1, 3.3   | Root/category/subcategory routes, deep links, browser Back/Forward     | TODO   |
| 5.3 | Catalog invalidation       | 5.2, 4.2   | Product/category changes invalidate every affected public route        | TODO   |

### Phase 6 — Testing, demo & launch (P0)

Agents: qa, devops, orchestrator

| ID  | Task                            | Depends on | Acceptance criteria                                                                   | Status |
| --- | ------------------------------- | ---------- | ------------------------------------------------------------------------------------- | ------ |
| 6.1 | Integration and E2E suite       | 1–5        | Real preview server; auth, RLS, CRUD, publish, catalog and cache                      | TODO   |
| 6.2 | Performance and security review | 6.1        | No private cache leakage, unsafe HTML, or cross-tenant writes; record latency         | TODO   |
| 6.3 | Demo and production smoke tests | 6.2        | Approved social page bio link, theme switch, Network cache evidence; rollback runbook | TODO   |
| 6.4 | MVP release gate                | 6.3        | All P0 acceptance criteria verified; mentor approval                                  | TODO   |

### Phase 7 — Post-MVP analytics (P1)

Agents: analytics

| ID  | Task                                | Depends on | Acceptance criteria                                                     | Status |
| --- | ----------------------------------- | ---------- | ----------------------------------------------------------------------- | ------ |
| 7.1 | GA4 instrumentation and attribution | 6.4        | Page and catalog events with slug/linktree ID; consent and UTM strategy | TODO   |
| 7.2 | Analytics dashboard                 | 7.1        | Authorized reports sliced by slug and entry source                      | TODO   |
| 7.3 | Optional ranking automation         | 7.2        | Approved scoring and pinned items; no automatic publish without policy  | TODO   |

## Release gate

MVP = phases 0–6. Phase 7 is optional and must not block launch. No calendar estimates until POC and existing backend audit are complete.
