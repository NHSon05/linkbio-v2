# Eosoft audit (V2-02)

Status: answers received 2026-11-26 (working decisions). Still open: column-level DDL of the Eosoft tables, exact `social_pages` DDL, and final confirmation of Q5. No production system is changed by this audit; we only ask for exports and descriptions.

Why: Sprints 6–7 change the database (membership, global slug, `social_pages.linktree_id`) and sign-in (SSO). None of that starts until these answers exist (`sprint-plan-v2.md` §4, Q1–Q5).

## What we ask Hoàng to share

- A **schema-only** export of the tables we will touch or read (no data): users/accounts, companies, memberships/roles, `social_pages`. For example: `supabase db dump --schema-only` limited to those tables, or a screenshot of the table definitions.
- The **RLS policies** and any database functions on those tables.
- The **auth configuration**: provider(s), redirect/callback URLs, session lifetime.
- The **domains** in use: Eosoft app, planned Linktree admin, planned public pages.

Never secrets: no service keys, passwords or connection strings in this doc or in chat.

## Questions

### Q1 — Identity provider

1. What signs users in to Eosoft today: Supabase Auth, another OIDC provider, SAML, or custom?
2. If Supabase Auth: is it the same Supabase project the Linktree app should use?
3. Which callback/redirect URLs can be added for the Linktree admin (preview and production)?
4. Do users have a verified company email or a company ID claim in their token?

Answer (2026-11-26): Eosoft uses **Supabase Auth with Google OAuth**. Production will share Eosoft's Supabase project. Until then, our current project (`link-bio-tree`) is **Staging/Demo** with standard Google sign-in; a company-email allowlist comes later.

### Q2 — Shared Supabase project and migrations

1. Is "shared Supabase" Eosoft's existing project? Which environment do we get for staging?
2. Who owns migrations in that project, and how do two repositories add migrations without conflicts (one migration folder, review process)?
3. May we add tables (`linktree_members`, `cache_invalidations`), functions and RLS policies? Any naming rules (schema, prefixes)?

Answer (2026-11-26): build and test on our current project (Staging) first. Migrations must not collide with Eosoft's existing tables (see "Eosoft tables" below): keep our tables in a separate schema or with a prefix until they are merged into Eosoft's project.

### Q3 — `social_pages`

1. Exact table name, primary key type (uuid/bigint) and owner/company column.
2. Who will write `social_pages.linktree_id`: Eosoft, this app, or both?
3. What should happen to the link when a Linktree is deleted (we propose `on delete set null`)?

Answer (2026-11-26, working): `uuid` primary key; `linktree_id` set to null when a Linktree is deleted (`on delete set null`). Until the exact `social_pages` DDL is confirmed, Staging uses a placeholder table.

### Q4 — Company, user and role

1. Is the tenant the company (all staff can edit its Linktrees) or the individual user?
2. Which roles exist in Eosoft today (owner/admin/editor/viewer…), and where are they stored?
3. Can a user belong to more than one company?

Answer (2026-11-26): the tenant is the **company** (`company_id`). One user belongs to exactly one company. All staff of a company reach its Linktrees according to their role: `super_admin`, `owner`, `admin`, `editor`, `viewer`.

### Q5 — Who writes Linktree and catalog data

1. Will Eosoft's backend write Linktree, page or product data directly to the database, or only through this app?
2. If directly: which tables, and how often? (This decides whether the signed refresh endpoint and outbox, V2-23, are needed for MVP.)

Answer (2026-11-26, pending final confirmation): assume this app is the **only writer** of Linktree and catalog data for now. The signed refresh endpoint and outbox (V2-23) are deferred until Eosoft confirms.

## Eosoft tables (confirmed 2026-11-26, names only)

Eosoft's shared Supabase already has, in schema `public`:

| Table                         | Holds (as described)                              | Overlaps with our table    |
| ----------------------------- | ------------------------------------------------- | -------------------------- |
| `sites`                       | Sites (Linktree-like pages)                       | `pages`                    |
| `profiles`                    | Drafts, published versions, username used in URLs | `profiles` (**same name**) |
| `site_admins`, `site_members` | Admin, editor, viewer permissions                 | planned membership table   |
| `site_versions`               | Publish history                                   | `page_versions`            |
| `slug_redirects`              | Old URL redirects                                 | `url_redirects`            |
| `site_traffic`                | Views and clicks                                  | `page_events`              |
| `builds`                      | Build tracking                                    | `deployments` (unused)     |

Consequences:

- Our `public.profiles` collides by name with Eosoft's `public.profiles`. Nothing of ours may be created in, or overwrite, Eosoft's `public` tables.
- Several Eosoft tables do the same job as ours. Whether we reuse them or keep our own depends on their column-level DDL, which we have not seen yet.
- Working plan (`data-model.md` → "v2: Eosoft coexistence"): our tables live in their own schema `linktree` on Staging, then are mapped or merged once the DDL is verified.

## Follow-ups for the mentor (not Hoàng)

Still open: column-level DDL for the tables above, exact `social_pages` DDL, Q5 confirmation, and the role permission matrix (what each of the five roles may do). Q6–Q12 in `sprint-plan-v2.md` §4: slug rules and redirect retention, member roles policy, catalog source, acceptable delay after publish, keeping email/Google sign-in, GA4 and consent, Vercel plan and staging project.
