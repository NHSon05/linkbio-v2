# LinkBio — Implementation Plan

## Goal

Ship a working MVP where two users can choose the same template, customize independently, publish distinct URLs and view static pages without per-request Supabase rendering.

## Phases

| Phase         | Deliverable                                                     | Exit criteria                                                                        |
| ------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| P0 Foundation | Next.js, Tailwind v4, Supabase local, lint/test/CI              | App starts; migrations + RLS tests pass                                              |
| P1 Data/Auth  | profiles, templates, pages, versioning, login                   | Tenant A cannot access B's drafts                                                    |
| P2 UI         | template gallery, My Pages, editor, mobile/desktop preview      | Shared renderer matches preview and public output                                    |
| P3 Publishing | validated publish, deploy trigger, SSG routes, deployment state | Two users with same page slug get distinct URLs; old release remains live on failure |
| P4 Analytics  | view/click ingestion, simple dashboard                          | Events map to correct page; ingestion protected                                      |
| P5 Operations | cron reconciliation, observability, performance/E2E             | Recovery from missed trigger; Chrome/mobile tests pass                               |

## Work streams

- Architecture/schema contracts before frontend/database/publisher parallel work.
- Database and UI can proceed in parallel after API/JSON contracts freeze.
- Publisher needs page-version semantics and route rules.
- Analytics can proceed once page IDs and block IDs are stable.
- QA writes acceptance tests alongside each feature, not only at the end.

## MVP user journeys

1. Sign up → reserve unique username.
2. Choose template → create page with own `page_id`.
3. Edit title, avatar, links, colors, font, radius, layout and block order.
4. Save draft → refresh → edits persist.
5. Preview mobile/desktop → publish → see deployment progress.
6. Open `/{username}/{slug}` after ready → expected static content.
7. Second user chooses same template/slug → separate content and URL.
8. Update published page → existing public version remains until new deployment succeeds.

## Definition of done

Typecheck, lint, unit/integration tests, RLS negative tests, Playwright user journey, responsive and accessibility checks, docs updated, deploy verification.

## Risks

- Global rebuild time grows with page count; monitor deployment duration.
- Build trigger rate limits and concurrent publish races; serialize/debounce deploy requests.
- Browser preview vs SSG divergence; share renderer and snapshot tests.
- Slug collision/renaming; reserve routes and test redirect behavior.
- Public analytics spam; rate limits and aggregated reporting.

## Initial implementation order

P0-01 scaffold → P0-02 schema/contracts → P1-01 migrations/RLS → P2-01 templates/renderer → P2-02 editor → P3-01 publish/versioning → P3-02 deployment → P4 analytics → P5 operations.
