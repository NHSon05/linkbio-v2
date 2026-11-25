# Template & Visual Editor

## Approach
Import approved HTML/CSS templates into a versioned library. Next.js admin hosts the editor; preview and public page use the same renderer and template version. GrapesJS is a candidate, not a committed dependency until POC compares it with constrained schema editor.

```text
Approved HTML/CSS → import + sanitize → template version
→ clone editable project → editor → draft JSON → server validation
→ immutable published snapshot → shared renderer → ISR/CDN
```

## Editor capabilities
| Area | MVP controls |
|---|---|
| Content | Avatar, title, subtitle, thumbnail, banner, social links, product links |
| Theme | Approved fonts, color, font size, radius, spacing, width |
| Layout | Reorder allowed blocks, visibility, list/grid, mobile/desktop preview |
| Templates | Gallery, preview, select, theme switch for demo |
| Lifecycle | Save draft, reload, preview, publish, validation errors |

## Data contract example
```json
{
  "schemaVersion": 1,
  "templateVersionId": "template-version-id",
  "theme": {"fontFamily": "Inter", "radius": 16, "primaryColor": "#2563EB"},
  "blocks": [{"id": "hero", "type": "banner", "visible": true, "props": {"title": "Tech Review"}}],
  "layout": {"mobileColumns": 1, "desktopColumns": 2}
}
```
If GrapesJS selected, store editor project JSON for rehydration and validated render artifact or canonical model; do not trust client-exported HTML. Define schema migration and template version pinning. Export HTML may be optional; publishing does not require writing files or redeploying.

## Rendering and security
Server validation for text, URL protocols, allowed style properties and ranges; sanitize HTML and CSS using vetted parsers/allowlists, remove scripts, event handlers, unsafe embeds, remote CSS imports and dangerous URLs. Do not use arbitrary code evaluation. Preview in sandboxed iframe with restrictive CSP; keep untrusted content isolated from admin origin/session. Public content uses controlled assets and renderer-owned interactions only. Validate upload size/type; restrict external resource fetching to avoid SSRF. Do not assume GrapesJS sanitizes content.

## POC gate
Import representative HTML with CSS/assets, change theme and content, save/reopen, compare mobile/desktop preview against public renderer, test malicious fixture rejection. Record import fidelity, limitations, accessibility and maintenance cost. Choose editor with mentor before Phase 3.

## Acceptance
Two Linktrees from same template remain independent; original template unchanged; draft not public; published output matches preview for same revision; responsive layout and keyboard navigation work.
