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

## Acceptance
Direct access, reload, browser Back/Forward, category scoping, old URL redirect, 404, mobile navigation and cache invalidation verified on remote preview.
