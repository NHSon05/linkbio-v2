---
paths:
  - "src/**/*"
  - "supabase/**/*"
  - "next.config.ts"
---

# Coding standards

- For Next.js changes, read the relevant guide in `node_modules/next/dist/docs/` before editing and follow the installed version's conventions.
- Follow the existing TypeScript and App Router patterns. Reuse shared UI, schemas, and helpers. Keep server-only data access on the server and client components focused on interaction.
- Use the same schema and renderer for editor preview and public pages. Preserve existing config versions, public routes, and data contracts or include the required migration.
- Use the project ESLint and Prettier configs. Run focused checks for the changed behavior and keep formatting changes within the task scope.
