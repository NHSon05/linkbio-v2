# LinkBio — Task Backlog

Statuses: `TODO`, `IN_PROGRESS`, `BLOCKED`, `DONE`. Owner is the responsible agent, not an assertion that work has begun.

| ID     | Priority | Owner        | Task                                               | Depends on    | Acceptance                       |
| ------ | -------- | ------------ | -------------------------------------------------- | ------------- | -------------------------------- |
| F-01   | P0       | architect    | Confirm routing, version and JSON schema contracts | —             | ADRs/contracts reviewed          |
| F-02   | P0       | devops       | Scaffold Next.js, lint, tests, CI, env examples    | F-01          | CI passes                        |
| DB-01  | P0       | database     | Supabase migrations, constraints, seeds            | F-01          | Local migrations pass            |
| DB-02  | P0       | database     | RLS + cross-tenant tests                           | DB-01         | Negative tests pass              |
| FE-01  | P0       | frontend     | Auth, shell, template gallery, My Pages            | F-02, DB-01   | Playwright flows pass            |
| UI-01  | P0       | ui-editor    | Zod schema + block registry + renderer             | F-01          | Renderer unit tests pass         |
| UI-02  | P0       | ui-editor    | Visual editor, save draft, preview                 | UI-01, DB-01  | Responsive preview + persistence |
| PUB-01 | P0       | publisher    | Version freeze and publish API                     | DB-01, UI-01  | Idempotent/version-safe          |
| PUB-02 | P0       | publisher    | SSG routes and Vercel trigger/status               | PUB-01        | Two distinct static URLs         |
| QA-01  | P0       | qa           | Auth/RLS and full publish E2E suite                | DB-02, PUB-02 | Tests green                      |
| AN-01  | P1       | analytics    | View/click ingestion and reporting                 | DB-01, UI-01  | Per-page aggregates correct      |
| OPS-01 | P1       | devops       | Cron reconciliation, monitoring, rollback          | PUB-02        | Failed deploy recovery verified  |
| DOC-01 | P0       | orchestrator | Keep project_summary and task statuses updated     | ongoing       | Evidence attached to DONE        |

## Parallelization

After F-01: DB-01, F-02 and UI-01 may run concurrently if contracts are frozen. FE-01 follows scaffold/DB; UI-02 follows UI-01; PUB-01 follows DB and schema; QA works on tests in parallel but completion waits for implementation.

## Handoff checklist

Changed files; schema/API changes; migrations; commands executed and results; screenshots if UI; tests; risks; next dependencies. Avoid simultaneous edits to shared files without orchestrator approval.
