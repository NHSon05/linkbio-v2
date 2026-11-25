# Testing Strategy

## Test pyramid and environments
| Layer | Tool | Scope |
|---|---|---|
| Unit | Vitest | Slug, schemas, style validation, permission helpers, routing |
| Integration | Vitest + isolated Supabase | RLS, FK, publish transaction, invalidation delivery |
| E2E | Playwright | Real Vercel Preview/Staging, auth, editor, catalog, publish |
| Cache | Node HTTP script | Cold/warm, update, invalidation, freshness, deployment |
| Performance | Lighthouse / controlled k6 | Mobile load, latency, error rate, cache efficiency |
| Smoke | HTTP/Playwright | Production read-only checks after deploy |

## Acceptance matrix
| ID | Scenario | Expected |
|---|---|---|
| AUTH-01 | Company user moves between apps | Same verified identity; SSO flow works |
| AUTH-02 | Unauthorized user edits another Linktree | Denied server-side and by RLS |
| DB-01 | Two social pages link same Linktree | Both succeed; unlink preserves Linktree |
| EDIT-01 | Save and reload draft | Same configuration; public unchanged |
| EDIT-02 | Malicious HTML/CSS/URL | Rejected or safely sanitized |
| RENDER-01 | Same revision in preview/public | Matching content and layout |
| CACHE-01 | Cold unique slug then repeated GET | MISS/HIT where observable; correct content |
| CACHE-02 | Publish and invalidate | New revision within SLA; warm cache stabilizes |
| CACHE-03 | Create previously missing slug | Cached 404 no longer served beyond SLA |
| CACHE-04 | Rename/delete/category/product change | All dependent routes updated |
| CACHE-05 | Deploy new renderer | New renderer revision and compatible data |
| CACHE-06 | Failed invalidation | Retry recorded; eventual recovery |
| CAT-01 | Navigate root/category/subcategory | Back/Forward and deep links correct |
| SEC-01 | Private preview and public cache | No draft/session leakage |
| DEMO-01 | Approved social bio link | Real mobile visitor reaches correct page |

## Remote cache test procedure
Create dedicated published fixture, GET same URL twice, record headers/status/version/latency; edit draft and assert unchanged; publish new revision; poll until fresh within approved SLA; request again and observe warm behavior. Record region, deployment ID and renderer revision. Do not assert immediate MISS when platform uses STALE. Use server instrumentation to verify query counts if needed. Cleanup fixtures only in test environment.

## CI gates
PR: lint, typecheck, unit, migration tests, build. Preview: integration, Playwright, cache script, accessibility checks. Release: all P0 pass, security review, approved demo, rollback runbook. Production: read-only smoke by default; no mutation or load tests without approval. Keep secrets out of logs and artifacts.

## Evidence
Store command, environment, commit, test fixture, actual result, timestamps and logs/screenshots. Report failed/skipped tests explicitly. No tests executed as part of this design document.
