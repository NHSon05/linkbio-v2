# LinkBio — Architecture & Agent Documentation

This folder is a **planning/specification package**, not an implemented application.

## Start here

1. `project_summary.md` — current decisions/status.
2. `ARCHITECTURE.md` — system design and publishing lifecycle.
3. `data-model.md` — Supabase tables and RLS requirements.
4. `API_Contract.md` — routes, payloads, errors and config contract.
5. `plan.md` — phased roadmap.
6. `TASKS.md` — executable task backlog.
7. `AGENTS.md` — subagent router and operating rules.
8. `agents/` — nine role-specific prompts (including orchestrator).

## First coding milestone

Implement F-01 and F-02, then DB-01 and UI-01. Do not begin a production deploy until authentication, RLS and publish-state tests pass.
