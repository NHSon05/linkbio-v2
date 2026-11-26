# LinkBio — API Contract (v1)

## Conventions

Base `/api/v1`. JSON responses. Auth via Supabase session cookie for dashboard; verify session/ownership server-side. Standard error: `{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": {} } }`. Use 400 validation, 401 unauthenticated, 403 forbidden, 404 missing, 409 conflicts, 429 rate-limited, 5xx server/provider errors. All writes validate Zod schemas. Never accept `ownerId` as an authority from the browser.

## Endpoints

| Method | Path                                 | Auth                 | Purpose                                          |
| ------ | ------------------------------------ | -------------------- | ------------------------------------------------ |
| GET    | `/api/v1/templates`                  | optional             | List active templates                            |
| GET    | `/api/v1/pages`                      | required             | List caller's pages (pagination)                 |
| POST   | `/api/v1/pages`                      | required             | Create page from template                        |
| GET    | `/api/v1/pages/{pageId}`             | owner                | Read metadata + current draft                    |
| PATCH  | `/api/v1/pages/{pageId}`             | owner                | Rename slug/title; check collision               |
| PUT    | `/api/v1/pages/{pageId}/draft`       | owner                | Save validated config with revision precondition |
| POST   | `/api/v1/pages/{pageId}/publish`     | owner                | Make reviewed revision live (on-demand)          |
| GET    | `/api/v1/pages/{pageId}/deployments` | owner                | Publish/deployment status                        |
| GET    | `/api/v1/pages/{pageId}/analytics`   | owner                | Aggregated counts by time period                 |
| POST   | `/api/v1/events`                     | public, rate-limited | Ingest view/click                                |
| POST   | `/api/internal/deployments/callback` | signed secret        | Deployment state update                          |

Next.js Server Actions may implement dashboard writes instead of REST, but must honor the same request/response semantics and authorization rules.

## Examples

### Create page

`POST /api/v1/pages`

```json
{ "templateKey": "classic", "slug": "tech-review" }
```

201:

```json
{
  "data": {
    "id": "<uuid>",
    "username": "son",
    "slug": "tech-review",
    "status": "draft",
    "draftRevision": 1
  }
}
```

409 `SLUG_TAKEN` if the same owner already has that slug; other owners may reuse it.

### Save draft

`PUT /api/v1/pages/{pageId}/draft`

```json
{
  "expectedRevision": 1,
  "config": {
    "schemaVersion": 1,
    "template": "classic",
    "theme": {},
    "layout": {},
    "profile": { "title": "Son", "socials": [] },
    "blocks": []
  }
}
```

200: `{ "data": { "revision": 2, "savedAt": "2026-11-24T00:00:00Z" } }`.
409 `REVISION_CONFLICT` if stale. `config` shown is schematic; real request must pass the versioned Zod schema.

### Publish

`POST /api/v1/pages/{pageId}/publish`

```json
{ "expectedRevision": 2 }
```

Implemented as the `publishPage(pageId, expectedRevision)` server action over `publish_page()`. It returns `{ revision }` once the page is live; there is no deployment queue. Errors: 404 for a page that doesn't exist or isn't the caller's, and 409 `REVISION_CONFLICT` when the draft changed since it was reviewed.

`queued` does **not** mean publicly live. Only deployment-ready verification marks live.

### Deployment status

`GET /api/v1/pages/{pageId}/deployments`

```json
{
  "data": {
    "status": "ready",
    "liveRevision": 2,
    "url": "https://linkbio.example/son/tech-review"
  }
}
```

### Tracking event

`POST /api/v1/events`

```json
{
  "path": "/tech-review",
  "type": "click",
  "blockId": "b-link-1",
  "referrerHost": "facebook.com",
  "utmSource": "facebook"
}
```

Implemented in `src/app/api/v1/events/route.ts` (2026-11-25). The public page knows its path, not its page id, so events name the path and the server resolves the live page. `blockId` is the clicked block's id, the product id, or `social-<type>`.

- 202 `{ "accepted": true }`, also for unknown or unpublished paths, so the endpoint does not reveal which pages exist.
- 400 for an invalid body, 413 for a body over 1 KB, 403 for another origin, and 429 for more than 60 events per minute per IP.
- 503 when storage is unavailable or `SUPABASE_SECRET_KEY` is missing.

No cookies or IPs are stored. Views are counted once per tab session. Do not trust event fields for authorization or billing.

## JSON config contract

Source of truth: `src/lib/schemas/site.ts` (D-01). Stored shape is `PageConfigSchema`:

- `schemaVersion: 1`
- `template: string` — template key (`classic`, `video-first`, `shop-grid`)
- `theme: {bg?, accent?, font?, radius?, button?: "pill" | "rounded"}` — empty = template default
- `layout: {hero?, main?, footer?}` — each `{blocks: blockId[], variant?: "list" | "grid-2" | "carousel", rank?}`
- `profile: {title, subtitle?, about?, avatar?, cover?, socials: {type, url}[]}`
- `blocks: Array<{id, type, title?, text?, url?, thumbnail?, items?, pinned?, hidden?, score?, ...}>` — `type` from `BLOCK_TYPES`; unknown types are skipped by the renderer
- `catalog?: {products: Product[], collections: {id, name, items: productId[]}[]}`
- `nav?`, `source?: {platform, pageId}`

Template manifests decide which block types each region accepts. Values are constrained by Zod; no arbitrary CSS/HTML and only `http(s)` product URLs. `pageId`, `ownerId`, `slug` stay outside the stored config as database metadata; the dashboard adds `slug` (the global slug, since V2-12b) when it reads a page (`SiteSchema`).

## Internal publishing protocol

On-demand (2026-11-25). `publish_page` sets `desired_version_id` and `live_version_id` to the reviewed immutable version in one locked transaction. The `deployments` table is unused for now.

Since V2-12/V2-14 (2026-11-26), pages live at `/{slug}`:

- **Public reads:** `get_published_page(p_path)` (anon) returns `(page_id, config, redirect_to)`.
  - `/{slug}` of a live page returns `config`.
  - An old address returns `redirect_to = '/{slug}'`. Old addresses are `/{oldslug}` after a rename, or `/{username}/{slug}` from before V2-12b.
  - A live page wins over a redirect.
- **Proxy responses:** 308 for a redirect, 404 for anything else.
- **Cache tags:** every cached lookup carries `path:{path}`, plus `page:{page_id}` when the lookup found a page.
  - publish: `updateTag(page:{id})` and `updateTag(path:/{slug})`
  - rename: `updateTag(page:{id})` and `updateTag(path:/{new})`
  - delete: `updateTag(page:{id})`
- **Writes and roles:**

  | RPC                                                         | Role                               | Errors                                                                                                   |
  | ----------------------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------- |
  | `create_page`, `publish_page`, `rename_page`, `delete_page` | admin+                             | 403 `FORBIDDEN` (role too low), 404 `PAGE_NOT_FOUND` (another company's page), 409 `SLUG_TAKEN` (global) |
  | `save_draft`                                                | editor+                            | same codes                                                                                               |
  | `slug_available(slug)`                                      | signed in, rate-limited by the app | none; returns `available`, `invalid`, `reserved` or `taken`                                              |

## Contract tests

Auth failures, cross-tenant access, duplicate username/slug, invalid config, revision conflict, unsafe URL, publish trigger failure, stale deployment callback, idempotent retries, tracking rate limit.
