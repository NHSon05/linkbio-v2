# LinkBio — Docs

## Project docs (kept current)

| File                    | What it holds                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| `project_summary.md`    | Status, decisions and the dated change log                                                |
| `TASKS.md`              | Task backlog with evidence for every done task; v2 backlog at the end                     |
| `ARCHITECTURE.md`       | System design, publishing and caching                                                     |
| `data-model.md`         | Supabase tables, functions and RLS                                                        |
| `API_Contract.md`       | Routes, payloads, errors and the page config contract                                     |
| `plan.md`               | Roadmap of record (v2): goal, decisions, sprints, journeys, definition of done            |
| `sprint-plan-v2.md`     | v2 plan reconciled with the built code: Keep/Change/New/Drop, Sprints 5–9, open questions |
| `template-authoring.md` | How to turn an approved design into a template                                            |
| `eosoft-audit.md`       | Questions and answers about Eosoft auth, schema and domains (V2-02)                       |

Agent routing and rules: `AGENTS.md` / `CLAUDE.md` at the repository root and `.claude/`.

## `v2-proposal/` (input, not maintained)

The Eosoft Linktree v2 proposal as received (2026-11-25): `plan-v2.md`, `url-routing.md`, `template-visual-editor.md`, `testing-strategy.md`, `repository-structure.md`. Where they conflict with `sprint-plan-v2.md`, the sprint plan wins. For example, user HTML import and GrapesJS were dropped, and templates stay JSON plus the shared renderer.
