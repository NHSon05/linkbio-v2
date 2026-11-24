-- DB-06: privileges + RLS policies. RLS is already enabled on every table (deny by default).
-- Supabase grants ALL on new public tables to anon/authenticated; narrow that to what clients need.
-- service_role bypasses RLS and is used only by trusted server code (builds, events, deployments).

revoke all on
  public.profiles, public.templates, public.pages, public.page_versions, public.media_assets,
  public.products, public.page_products, public.deployments, public.url_redirects, public.page_events
from anon, authenticated;

-- profiles: public fields readable once a username exists; owner edits own row.
grant select (id, username, display_name, avatar_url) on public.profiles to anon, authenticated;
grant update (username, display_name, avatar_url) on public.profiles to authenticated;

create policy profiles_select_public on public.profiles
for select to anon, authenticated
using (username is not null or id = (select auth.uid()));

create policy profiles_update_own on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

-- templates: active ones readable by everyone.
grant select on public.templates to anon, authenticated;

create policy templates_select_active on public.templates
for select to anon, authenticated
using (is_active);

-- pages: owner reads and deletes; create/save go through create_page()/save_draft().
grant select, delete on public.pages to authenticated;

create policy pages_select_own on public.pages
for select to authenticated
using (owner_id = (select auth.uid()));

create policy pages_delete_own on public.pages
for delete to authenticated
using (owner_id = (select auth.uid()));

-- page_versions: owner reads; inserts only via save_draft().
grant select on public.page_versions to authenticated;

create policy page_versions_select_own on public.page_versions
for select to authenticated
using (exists (select 1 from public.pages p where p.id = page_id and p.owner_id = (select auth.uid())));

-- media_assets: owner reads, records and deletes own uploads.
grant select, insert, delete on public.media_assets to authenticated;

create policy media_assets_select_own on public.media_assets
for select to authenticated
using (owner_id = (select auth.uid()));

create policy media_assets_insert_own on public.media_assets
for insert to authenticated
with check (owner_id = (select auth.uid()) and storage_bucket = 'media');

create policy media_assets_delete_own on public.media_assets
for delete to authenticated
using (owner_id = (select auth.uid()));

-- products: full CRUD on own rows.
grant select, insert, update, delete on public.products to authenticated;

create policy products_select_own on public.products
for select to authenticated
using (owner_id = (select auth.uid()));

create policy products_insert_own on public.products
for insert to authenticated
with check (owner_id = (select auth.uid()));

create policy products_update_own on public.products
for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy products_delete_own on public.products
for delete to authenticated
using (owner_id = (select auth.uid()));

-- page_products: own page + own product (trigger also checks owners match).
grant select, insert, update, delete on public.page_products to authenticated;

create policy page_products_select_own on public.page_products
for select to authenticated
using (exists (select 1 from public.pages p where p.id = page_id and p.owner_id = (select auth.uid())));

create policy page_products_insert_own on public.page_products
for insert to authenticated
with check (exists (select 1 from public.pages p where p.id = page_id and p.owner_id = (select auth.uid())));

create policy page_products_update_own on public.page_products
for update to authenticated
using (exists (select 1 from public.pages p where p.id = page_id and p.owner_id = (select auth.uid())))
with check (exists (select 1 from public.pages p where p.id = page_id and p.owner_id = (select auth.uid())));

create policy page_products_delete_own on public.page_products
for delete to authenticated
using (exists (select 1 from public.pages p where p.id = page_id and p.owner_id = (select auth.uid())));

-- deployments / url_redirects: owner reads status of own pages; server writes.
grant select on public.deployments, public.url_redirects to authenticated;

create policy deployments_select_own on public.deployments
for select to authenticated
using (exists (select 1 from public.pages p where p.id = page_id and p.owner_id = (select auth.uid())));

create policy url_redirects_select_own on public.url_redirects
for select to authenticated
using (exists (select 1 from public.pages p where p.id = page_id and p.owner_id = (select auth.uid())));

-- page_events: no client access at all (ingestion + aggregates via server, AN-01/AN-02).
