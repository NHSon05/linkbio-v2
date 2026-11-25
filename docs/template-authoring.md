# Template authoring (V2-07)

How a developer turns an approved design into a LinkBio template. This replaces v2's "import HTML/CSS templates" (decision 2026-11-26): designs are converted at development time into a manifest and design tokens. Users never upload HTML, CSS or JS, and the same renderer (`src/lib/renderer/BioPage.tsx`) draws the editor preview and the public page.

## What a template is

A template does not contain the page content. It decides:

| Part                            | Where                                                         | Example                                                                             |
| ------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Regions and allowed block types | `src/templates/<id>/template.json` → `regions`                | `hero` allows one `banner`                                                          |
| Layout of the main region       | `regions.main.variants`, `defaultVariant`                     | `list`, `grid-2`, `carousel`                                                        |
| Desktop layout                  | `desktop` (`center`, `split`, `grid`), `desktopColumns` (1–3) | `split` = profile left, content right                                               |
| Default theme                   | `themeDefaults`                                               | `bg`, `accent`, `font`, `radius`, `button`; optional `fontSize`, `spacing`, `width` |
| Starter content for new pages   | migration: `templates.default_config`                         | sample links and cards                                                              |

The page content lives in the page draft (`blocks`, `layout`, `theme` overrides). That is why users can switch templates without losing content (tested in `src/lib/schemas/site.test.ts`): a block whose type the new template's region does not allow stays in the draft but is not drawn on the page (`regionBlocks`), and it shows again after switching back. Nothing is deleted.

## Steps

1. **Map the design onto the existing model.** List the design's sections and match each one to a region and a block type from `BLOCK_SPECS` (`src/lib/renderer/blocks.ts`). Express its colours, font, corner radius, density and width as `themeDefaults`. If the design needs a block type or layout that does not exist, stop: that is renderer work (`ui-editor` agent) with its own task and tests, not part of a template.
2. **Write the manifest.** Create `src/templates/<id>/template.json`. The `id` must match `^[a-z0-9][a-z0-9-]{0,39}$`. Copy an existing template (e.g. `classic/template.json`) and change it. `TemplateSchema` (`src/lib/schemas/site.ts`) validates it at import time.
3. **Register it.** Import the JSON in `src/templates/index.ts` and add it to `raw`. The template picker and the editor read from there.
4. **Add the database row and starter in one migration.** Create `supabase/migrations/<timestamp>_template_<id>.sql`:
   - `insert into public.templates (key, name, description, manifest, default_config) values (...)`, with `manifest` = the same JSON as `template.json` (the database copy is for reference; the app reads the JSON file). `create_page` and `save_draft` only accept keys that have an active row.
   - Then `update public.templates set default_config = '<starter>'::jsonb where key = '<id>';` with a starter that uses only block types the editor can edit (`EDITABLE_TYPES`), placed in regions that allow them. Escape `'` as `''`.
5. **Run the checks.** `pnpm test` picks up the new starter from any migration, with the latest per template winning:
   - `site.test.ts` "starts every template with valid sample content" checks that every registered template has a starter, the starter parses, and its blocks are editable and allowed.
   - `BioPage.test.tsx` writes a new snapshot for the starter. Review it with `pnpm vitest run -u src/lib/renderer` and commit it.
   - Run `pnpm lint`, `pnpm typecheck` and `pnpm build`.
6. **Look at it.** Check the phone and desktop previews in the editor, switch to and from the new template on a page that has content, and check a published page. Attach screenshots to the task.
7. **Ship.** Apply the migration with `supabase db push` only after approval, then deploy. A template whose row exists but whose code is not deployed yet would fail, so deploy the code first, or in the same release.

## Rules

- No HTML, CSS or script strings in a manifest or starter, and no new CSS per template. Visual differences come from the manifest, theme tokens and the shared renderer.
- Only fonts from the approved list (`FONTS` in `workspace/design.tsx`). Other fonts fall back to the system font until a font loader exists.
- Do not change an existing template's `id`; pages store it. To retire a template, set `is_active = false` in a migration. Existing pages keep rendering, and new pages can no longer use it.
- Changing a live template's regions can hide blocks on existing pages (types no longer allowed, or over `max`); say so in the task and check one real page.
