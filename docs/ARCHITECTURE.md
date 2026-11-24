# Architecture

| Path | Purpose |
|------|---------|
| `src/app/(auth)` | Login and sign-up routes |
| `src/app/(dashboard)/dashboard` | Signed-in area: templates, pages, editor, analytics |
| `src/app/(public)/[username]/[slug]` | Published bio pages |
| `src/app/api` | Route handlers |
| `src/components/{ui,dashboard,editor,landing}` | React components by area |
| `src/templates/*` | Page templates (tech-review, tiktok-beauty, fanpage-abc) |
| `src/lib/supabase` | Supabase clients |
| `src/lib/renderer` | Turns page data + template into UI |
| `src/lib/schemas` | Data validation schemas |
| `src/lib/publishing` | Publish / unpublish logic |
| `src/types` | Shared TypeScript types |
| `supabase/migrations` | SQL migrations |
| `scripts` | One-off and maintenance scripts |
