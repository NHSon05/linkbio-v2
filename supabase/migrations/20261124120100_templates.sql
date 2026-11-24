-- DB-02: templates (read-only reference data). Seeded from src/components/dashboard/mock/templates.
create table public.templates (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^[a-z0-9][a-z0-9-]{0,39}$'),
  name text not null check (char_length(name) between 1 and 80),
  description text,
  -- Regions, allowed block types, themeDefaults (TemplateSchema in src/lib/schemas/site.ts).
  manifest jsonb not null check (jsonb_typeof(manifest) = 'object'),
  -- Starter PageConfig copied into a new page's first version.
  default_config jsonb not null check (jsonb_typeof(default_config) = 'object'),
  schema_version int not null default 1 check (schema_version > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.templates enable row level security;

insert into public.templates (key, name, description, manifest, default_config) values
  ('classic', 'Classic', 'Profile trên cùng, danh sách link và card. Giống Linktree, hợp page ít nội dung.',
   '{"id": "classic", "name": "Classic", "description": "Profile trên cùng, danh sách link và card. Giống Linktree, hợp page ít nội dung.", "desktop": "center", "desktopColumns": 2, "regions": {"header": {"label": "Header", "allow": ["profile"]}, "hero": {"label": "Hero", "allow": ["hero-video", "banner", "release"], "max": 1, "rank": false}, "main": {"label": "Nội dung chính", "allow": ["card", "link", "carousel", "banner", "shop", "products", "video", "events", "release"], "variants": ["list", "grid-2", "carousel"], "defaultVariant": "list", "rank": true}, "footer": {"label": "Footer", "allow": ["link", "subscribe", "banner"], "rank": false}}, "themeDefaults": {"bg": "#F7F7F7", "accent": "#CBD77E", "font": "Sora", "radius": 28, "button": "pill"}}'::jsonb,
   '{"schemaVersion": 1, "template": "classic", "theme": {}, "layout": {}, "profile": {"title": "Trang của tôi", "socials": []}, "blocks": []}'::jsonb),
  ('video-first', 'Video lên đầu', 'Video / release viral to nhất ở trên, sản phẩm vuốt ngang bên dưới. Hợp page TikTok.',
   '{"id": "video-first", "name": "Video lên đầu", "description": "Video / release viral to nhất ở trên, sản phẩm vuốt ngang bên dưới. Hợp page TikTok.", "desktop": "split", "desktopColumns": 2, "regions": {"header": {"label": "Header", "allow": ["profile"]}, "hero": {"label": "Hero", "allow": ["hero-video", "video", "release"], "max": 1, "rank": false}, "main": {"label": "Nội dung chính", "allow": ["card", "carousel", "link", "shop", "products", "events", "video", "banner"], "variants": ["carousel", "list", "grid-2"], "defaultVariant": "carousel", "rank": true}, "footer": {"label": "Footer", "allow": ["link", "subscribe"], "rank": false}}, "themeDefaults": {"bg": "#282828", "accent": "#CBD77E", "font": "Sora", "radius": 24, "button": "pill"}}'::jsonb,
   '{"schemaVersion": 1, "template": "video-first", "theme": {}, "layout": {}, "profile": {"title": "Trang của tôi", "socials": []}, "blocks": []}'::jsonb),
  ('shop-grid', 'Shop grid', 'Lưới sản phẩm 2 cột có thumbnail. Hợp page bán hàng nhiều sản phẩm.',
   '{"id": "shop-grid", "name": "Shop grid", "description": "Lưới sản phẩm 2 cột có thumbnail. Hợp page bán hàng nhiều sản phẩm.", "desktop": "grid", "desktopColumns": 3, "regions": {"header": {"label": "Header", "allow": ["profile"]}, "hero": {"label": "Hero", "allow": ["banner", "hero-video"], "max": 1, "rank": false}, "main": {"label": "Nội dung chính", "allow": ["card", "shop", "products", "carousel", "link", "banner"], "variants": ["grid-2", "list"], "defaultVariant": "grid-2", "rank": true}, "footer": {"label": "Footer", "allow": ["link", "banner", "subscribe"], "rank": false}}, "themeDefaults": {"bg": "#F7F7F7", "accent": "#E6CA9A", "font": "Sora", "radius": 20, "button": "rounded"}}'::jsonb,
   '{"schemaVersion": 1, "template": "shop-grid", "theme": {}, "layout": {}, "profile": {"title": "Trang của tôi", "socials": []}, "blocks": []}'::jsonb)
on conflict (key) do nothing;
