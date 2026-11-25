# Proposed Repository Structure

## Repo boundaries
Eosoft remains independent. Add only approved integration changes: navigation, social page association, shared permission/mutation contract. New Linktree repo owns editor, preview, public renderer and catalog. Shared DB migrations have one agreed owner and review process across both repos.

```text
linktree-platform/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   ├── (admin)/admin/linktrees/
│   │   ├── (public)/[slug]/[category]/[subcategory]/
│   │   └── api/revalidate/
│   ├── components/{ui,editor,renderer}/
│   ├── features/{auth,linktrees,templates,catalog}/
│   ├── lib/{supabase,auth,permissions,cache,validation}/
│   └── types/
├── templates/                 # approved source assets
├── supabase/migrations/       # only if agreed migration owner
├── scripts/{test-cache.ts,smoke-test.ts}
├── tests/{unit,integration,e2e}/
├── docs/
│   ├── database-architecture.md
│   ├── caching-architecture.md
│   ├── url-routing.md
│   ├── template-visual-editor.md
│   ├── testing-strategy.md
│   ├── technology-stack.md
│   ├── repository-structure.md
│   ├── plan.md
│   └── mvp-scope.md
├── .claude/agents/
├── .github/workflows/
├── CLAUDE.md
└── AGENTS.md
```

## Ownership
| Agent | Scope |
|---|---|
| architect / orchestrator | Contracts, decisions, plan, integration |
| auth / database | Shared identity, RLS, migrations |
| frontend / ui-editor | Admin and editor |
| renderer / cache | Shared rendering, public routes, revalidation |
| catalog | Category/product model and navigation |
| qa / devops | Tests, CI, environments, release |
| analytics | Post-MVP |

No overlapping edits without coordination. Do not copy renderer code manually across repos. Use versioned API contracts and cross-repo PR review for shared schema changes. Keep `.env` secrets untracked; separate local, preview and production credentials. No privileged keys in `NEXT_PUBLIC_*`.
