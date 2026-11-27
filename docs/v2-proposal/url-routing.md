# URL Routing — Linktree & Catalog

## Public contract
| Route | Purpose |
|---|---|
| `/{slug}` | Linktree entry point |
| `/{slug}/{category}` | Category listing |
| `/{slug}/{category}/{subcategory}` | Subcategory listing or agreed detail view |
| `/admin/linktrees/{id}/edit` | Private editor, immutable ID |
| `/api/revalidate` | Protected server endpoint |

Example: `/tech-review` → `/tech-review/laptops` → `/tech-review/laptops/macbook`. Product CTA opens validated external URL in MVP. If product detail routes are needed, reserve a distinct segment or agree a revised depth contract rather than ambiguous slug matching.

## App Router layout
```text
src/app/
  (public)/[slug]/page.tsx
  (public)/[slug]/[category]/page.tsx
  (public)/[slug]/[category]/[subcategory]/page.tsx
  (admin)/admin/linktrees/[id]/edit/page.tsx
  api/revalidate/route.ts
```

Use Next.js Link for navigation; URL is source of truth for category selection. Back/Forward, refresh and deep links must restore the correct listing. Breadcrumbs link to actual parent routes. Query params for optional filters only; define cache policy for them.

## Resolution and errors
Resolve normalized slug to published Linktree ID, then category scoped to that ID and subcategory scoped to its parent. Return actual HTTP 404 for absent/unpublished routes; verify status on deployed server including streaming behavior. Reject reserved names (`admin`, `api`, `login`, `_next`, etc.). No user-specific username prefix under proposed global slug baseline. Reserve aliases to prevent hijacking old links.

## Rename and SEO
On rename, reserve new slug transactionally, record old alias, invalidate both route trees and cached 404s. Redirect old URLs to matching new routes where valid; define permanent redirect retention and avoid chains/loops. Canonical URL and sitemap include only published routes. No index for preview/admin.

## Implemented (Sprint 8, 2026-11-27)

Q8 puts categories in the page config, frozen in each published version (`data-model.md`, "Catalog in the page config").

- **Routes:** `(public)/[slug]/[category]` and `(public)/[slug]/[category]/[subcategory]`. Both render `BioPage` with `view` and read the same cached snapshot as `/{slug}`, which carries tags `path:/{slug}` and `page:{id}`. Publish, rename and delete therefore refresh category views too, and no extra invalidation is needed.
- **Proxy** (`src/lib/publishing/exists.ts`, `src/proxy.ts`), in this order:
  1. Two segments only: an exact old address `/{username}/{slug}` gives 308 to `/{slug}`. It wins over a category with the same path, so a page that later takes the slug `{username}` cannot capture old links.
  2. A renamed page gives 308 and keeps the rest: `/{old}/{cat}[/{sub}]` → `/{new}/{cat}[/{sub}]`.
  3. A live page whose snapshot has that category or subcategory: render it. Only `config->catalog->categories` is read, and only for category paths.
  4. Anything else gives 404, including unknown categories and subcategories, and any other 2–3 segment path that is not a static app route (`APP_PATHS`, kept equal to `src/app` by a test).

  Both lookups of a 2-segment path run in parallel. Supabase errors are logged and treated as "page", so an outage never hides real pages.

  Internal links use `prefetch={false}`, because every prefetch passes this uncached lookup. Known gaps: 1-segment paths that fail the slug rule (e.g. `/Son-Hong`), and paths whose last segment has a dot (left to Next for `public/` files), still answer a soft 404 (HTTP 200).
- **Products** open `affiliateUrl || url` (http/https only) in a new tab; there is no detail route.

## Acceptance
Direct access, reload, browser Back/Forward, category scoping, old URL redirect, 404, mobile navigation and cache invalidation verified on remote preview.
