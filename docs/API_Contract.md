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
| POST   | `/api/v1/pages/{pageId}/publish`     | owner                | Freeze version + request deploy                  |
| GET    | `/api/v1/pages/{pageId}/deployments` | owner                | Publish/deployment status                        |
| GET    | `/api/v1/pages/{pageId}/analytics`   | owner                | Aggregated counts by time period                 |
| POST   | `/api/v1/events`                     | public, rate-limited | Ingest view/click                                |
| POST   | `/api/internal/deployments/callback` | signed secret        | Deployment state update                          |

Next.js Server Actions may implement dashboard writes instead of REST, but must honor the same request/response semantics and authorization rules.

## Examples

### Create page

`POST /api/v1/pages`

```json
{ "templateKey": "tech-review", "slug": "tech-review" }
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
    "templateId": "tech-review",
    "theme": {},
    "layout": {},
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

202:

```json
{
  "data": {
    "publicationId": "<uuid>",
    "status": "queued",
    "targetUrl": "https://linkbio.example/son/tech-review"
  }
}
```

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
  "pageId": "<uuid>",
  "eventType": "click",
  "blockId": "product-01",
  "utmSource": "facebook"
}
```

202 `{ "accepted": true }`. Do not trust event fields for authorization or billing; validate, deduplicate/rate-limit, minimize IP/PII.

## JSON config contract

`schemaVersion: number`, `templateId: string`, `theme: {primaryColor, backgroundColor, fontFamily, borderRadius}`, `layout: {maxWidth, spacing}`, `blocks: Array<{id, type, order, visible, props, styles, responsive}>`. Block types are an allowlist (`profile`, `social-links`, `banner`, `product-grid`, `carousel`). Values are constrained by Zod; avoid arbitrary CSS and unsafe URLs. Keep `pageId`, `ownerId`, `slug` outside renderer config as database metadata.

## Internal publishing protocol

Publish stores desired immutable version transactionally. Deployment trigger carries a release/version identifier and an idempotency key. Callback requires HMAC or provider-verified signature; verify that callback deployment/version matches latest desired release before promoting `live_version_id`. Hourly reconciliation handles missed callbacks. Concurrent publishes must not regress live state.

## Contract tests

Auth failures, cross-tenant access, duplicate username/slug, invalid config, revision conflict, unsafe URL, publish trigger failure, stale deployment callback, idempotent retries, tracking rate limit.
