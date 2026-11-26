-- V2-10b (approved 2026-11-26, option A): our objects leave `public` and `private`, because Eosoft's shared
-- Supabase already has public.profiles, sites, site_members, ... (docs/eosoft-audit.md, data-model.md).
-- Data, RLS policies, indexes, constraints, triggers and grants move with the tables and functions.
-- Function bodies name tables explicitly (search_path = ''), so they are re-created below with linktree.* names.

create schema linktree;
create schema linktree_private;
revoke all on schema linktree_private from public;
grant usage on schema linktree to anon, authenticated, service_role;
-- Same defaults Supabase gives `public`, so later migrations behave the same here (RLS still decides access).
alter default privileges in schema linktree grant all on tables to anon, authenticated, service_role;
alter default privileges in schema linktree grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema linktree grant execute on functions to anon, authenticated, service_role;

alter table public.profiles set schema linktree;
alter table public.templates set schema linktree;
alter table public.pages set schema linktree;
alter table public.page_versions set schema linktree;
alter table public.media_assets set schema linktree;
alter table public.products set schema linktree;
alter table public.page_products set schema linktree;
alter table public.deployments set schema linktree;
alter table public.url_redirects set schema linktree;
alter table public.page_events set schema linktree;
alter function public.create_page(text, text) set schema linktree;
alter function public.get_published_page(text, text) set schema linktree;
alter function public.page_traffic(integer) set schema linktree;
alter function public.publish_page(uuid, bigint) set schema linktree;
alter function public.record_page_event(text, text, text, text, text, text) set schema linktree;
alter function public.rename_page(uuid, text) set schema linktree;
alter function public.save_draft(uuid, bigint, jsonb) set schema linktree;
alter function private.check_page_product_owner() set schema linktree_private;
alter function private.forbid_update() set schema linktree_private;
alter function private.handle_new_user() set schema linktree_private;
alter function private.lock_username() set schema linktree_private;
alter function private.set_updated_at() set schema linktree_private;

-- `private` held only our trigger helpers; fails (and rolls back) if anything else is in it.
drop schema private;
-- The sign-up trigger on auth.users keeps its name here: only auth.users' owner (supabase_auth_admin) may
-- rename or drop it. It now calls linktree_private.handle_new_user. When merging into Eosoft's project, create it
-- as linktree_on_auth_user_created there, since Eosoft likely uses the default name (data-model.md, V2-10b).

-- Bodies re-created with linktree.* table names (generated from pg_get_functiondef, then reviewed).
CREATE OR REPLACE FUNCTION linktree.create_page(p_template_key text, p_slug text)
 RETURNS linktree.pages
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_template linktree.templates;
  v_page linktree.pages;
  v_version_id uuid;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'PT401';
  end if;
  if not exists (select 1 from linktree.profiles where id = v_uid and username is not null) then
    raise exception 'USERNAME_REQUIRED' using errcode = 'PT403';
  end if;
  select * into v_template from linktree.templates where key = p_template_key and is_active;
  if not found then
    raise exception 'TEMPLATE_NOT_FOUND' using errcode = 'PT404';
  end if;

  begin
    insert into linktree.pages (owner_id, template_id, slug)
    values (v_uid, v_template.id, p_slug)
    returning * into v_page;
  exception
    when unique_violation then
      raise exception 'SLUG_TAKEN' using errcode = 'PT409';
    when check_violation then
      raise exception 'INVALID_SLUG' using errcode = 'PT400';
  end;

  insert into linktree.page_versions (page_id, revision, schema_version, config, created_by)
  values (
    v_page.id, 1, v_template.schema_version,
    v_template.default_config || jsonb_build_object('template', v_template.key), v_uid
  )
  returning id into v_version_id;

  update linktree.pages set draft_version_id = v_version_id where id = v_page.id returning * into v_page;
  return v_page;
end;
$function$
;

CREATE OR REPLACE FUNCTION linktree.get_published_page(p_username text, p_slug text)
 RETURNS TABLE(config jsonb, redirect_to text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  -- A live page wins over a redirect for the same path (a new page may reuse a renamed page's old slug).
  select config, redirect_to from (
    select v.config, null::text as redirect_to, 0 as priority
    from linktree.profiles pr
    join linktree.pages p on p.owner_id = pr.id
    join linktree.page_versions v on v.id = p.live_version_id and v.page_id = p.id
    where pr.username = p_username and p.slug = p_slug
    union all
    select null::jsonb, r.new_path, 1
    from linktree.url_redirects r
    where r.old_path = '/' || p_username || '/' || p_slug
  ) found
  order by priority
  limit 1;
$function$
;

CREATE OR REPLACE FUNCTION linktree.page_traffic(p_days integer DEFAULT 30)
 RETURNS TABLE(page_id uuid, day date, views bigint, clicks bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select
    e.page_id,
    (e.occurred_at at time zone 'Asia/Ho_Chi_Minh')::date as day,
    count(*) filter (where e.event_type = 'view') as views,
    count(*) filter (where e.event_type = 'click') as clicks
  from linktree.page_events e
  join linktree.pages p on p.id = e.page_id
  where p.owner_id = (select auth.uid())
    and e.occurred_at >= (
      ((now() at time zone 'Asia/Ho_Chi_Minh')::date - (least(greatest(p_days, 1), 90) - 1))::timestamp
      at time zone 'Asia/Ho_Chi_Minh'
    )
  group by 1, 2
  order by 1, 2;
$function$
;

CREATE OR REPLACE FUNCTION linktree.publish_page(p_page_id uuid, p_expected_revision bigint)
 RETURNS TABLE(revision bigint, live_version_id uuid, slug text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_page linktree.pages;
  v_draft linktree.page_versions;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'PT401';
  end if;
  select * into v_page from linktree.pages where id = p_page_id and owner_id = v_uid for update;
  if not found then
    raise exception 'PAGE_NOT_FOUND' using errcode = 'PT404';
  end if;
  select * into v_draft from linktree.page_versions where id = v_page.draft_version_id;
  -- Never publish a newer draft than the one the owner reviewed (e.g. saved from another tab).
  if v_draft.revision <> p_expected_revision then
    raise exception 'REVISION_CONFLICT' using errcode = 'PT409';
  end if;

  if v_page.live_version_id is distinct from v_draft.id then
    update linktree.pages
    set desired_version_id = v_draft.id, live_version_id = v_draft.id, status = 'published'
    where id = v_page.id;
  end if;
  return query select v_draft.revision, v_draft.id, v_page.slug;
end;
$function$
;

CREATE OR REPLACE FUNCTION linktree.record_page_event(p_username text, p_slug text, p_event_type text, p_block_id text DEFAULT NULL::text, p_referrer_host text DEFAULT NULL::text, p_utm_source text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_page_id uuid;
begin
  select p.id into v_page_id
  from linktree.pages p
  join linktree.profiles pr on pr.id = p.owner_id
  where pr.username = p_username and p.slug = p_slug and p.live_version_id is not null;
  if v_page_id is null then
    return false;
  end if;
  -- Column checks on page_events enforce event_type and field lengths.
  insert into linktree.page_events (page_id, event_type, block_id, referrer_host, utm_source)
  values (v_page_id, p_event_type, p_block_id, p_referrer_host, p_utm_source);
  return true;
end;
$function$
;

CREATE OR REPLACE FUNCTION linktree.rename_page(p_page_id uuid, p_new_slug text)
 RETURNS linktree.pages
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_username text;
  v_page linktree.pages;
  v_old_path text;
  v_new_path text;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'PT401';
  end if;
  select username into v_username from linktree.profiles where id = v_uid;
  if v_username is null then
    raise exception 'USERNAME_REQUIRED' using errcode = 'PT403';
  end if;
  select * into v_page from linktree.pages where id = p_page_id and owner_id = v_uid for update;
  if not found then
    raise exception 'PAGE_NOT_FOUND' using errcode = 'PT404';
  end if;
  if v_page.slug = p_new_slug then
    return v_page;
  end if;

  v_old_path := '/' || v_username || '/' || v_page.slug;
  v_new_path := '/' || v_username || '/' || p_new_slug;

  begin
    update linktree.pages set slug = p_new_slug where id = v_page.id returning * into v_page;
  exception
    when unique_violation then
      raise exception 'SLUG_TAKEN' using errcode = 'PT409';
    when check_violation then
      raise exception 'INVALID_SLUG' using errcode = 'PT400';
  end;

  -- The new address is a real page again, so it can no longer redirect elsewhere.
  delete from linktree.url_redirects where old_path = v_new_path;
  if v_page.live_version_id is not null then
    -- Older addresses of this page skip straight to the new one (no redirect chains).
    update linktree.url_redirects set new_path = v_new_path where new_path = v_old_path;
    insert into linktree.url_redirects (page_id, old_path, new_path)
    values (v_page.id, v_old_path, v_new_path)
    on conflict (old_path) do update set page_id = excluded.page_id, new_path = excluded.new_path;
  end if;
  return v_page;
end;
$function$
;

CREATE OR REPLACE FUNCTION linktree.save_draft(p_page_id uuid, p_expected_revision bigint, p_config jsonb)
 RETURNS TABLE(version_id uuid, revision bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_page linktree.pages;
  v_current bigint;
  v_template_id uuid;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'PT401';
  end if;
  -- Lock the page so concurrent saves serialize on the revision check.
  select * into v_page from linktree.pages where id = p_page_id and owner_id = v_uid for update;
  if not found then
    raise exception 'PAGE_NOT_FOUND' using errcode = 'PT404';
  end if;
  if jsonb_typeof(p_config) is distinct from 'object' or p_config -> 'schemaVersion' is distinct from '1'::jsonb then
    raise exception 'INVALID_CONFIG' using errcode = 'PT400';
  end if;
  select id into v_template_id from linktree.templates where key = p_config ->> 'template' and is_active;
  if not found then
    raise exception 'TEMPLATE_NOT_FOUND' using errcode = 'PT400';
  end if;

  select v.revision into v_current from linktree.page_versions v where v.id = v_page.draft_version_id;
  if v_current is distinct from p_expected_revision then
    raise exception 'REVISION_CONFLICT' using errcode = 'PT409';
  end if;

  insert into linktree.page_versions (page_id, revision, schema_version, config, created_by)
  values (p_page_id, v_current + 1, 1, p_config, v_uid)
  returning id, page_versions.revision into version_id, revision;

  update linktree.pages set draft_version_id = version_id, template_id = v_template_id where id = p_page_id;
  return next;
end;
$function$
;

CREATE OR REPLACE FUNCTION linktree_private.check_page_product_owner()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if (select owner_id from linktree.pages where id = new.page_id)
     is distinct from (select owner_id from linktree.products where id = new.product_id) then
    raise exception 'page and product owners differ' using errcode = 'PT403';
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION linktree_private.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into linktree.profiles (id, display_name, avatar_url)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), 80),
    case when new.raw_user_meta_data ->> 'avatar_url' ~ '^https?://' then new.raw_user_meta_data ->> 'avatar_url' end
  )
  on conflict (id) do nothing;
  return new;
end;
$function$
;
