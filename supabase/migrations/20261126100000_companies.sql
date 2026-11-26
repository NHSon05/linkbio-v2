-- V2-11a–c: the tenant is the company (eosoft-audit.md Q4). One user belongs to exactly one company.
-- Role matrix (approved 2026-11-26, data-model.md): viewer reads; editor saves drafts and uploads;
-- admin creates, publishes, renames and deletes; owner manages members; super_admin grants super_admin.
-- pages.owner_id stays as the creator (audit); access follows pages.company_id.

create table linktree.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  created_at timestamptz not null default now()
);
alter table linktree.companies enable row level security;

create table linktree.company_members (
  company_id uuid not null references linktree.companies (id) on delete cascade,
  user_id uuid not null unique references linktree.profiles (id) on delete cascade,
  role text not null check (role in ('super_admin', 'owner', 'admin', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (company_id, user_id)
);
alter table linktree.company_members enable row level security;

-- New linktree tables get Supabase-style grants by default (V2-10b); narrow them to reads.
revoke all on linktree.companies, linktree.company_members from anon, authenticated;
grant select on linktree.companies, linktree.company_members to authenticated;

-- Own membership only (no self-reference, so no RLS recursion). Member management comes later (V2-11e).
create policy company_members_select_own on linktree.company_members
for select to authenticated
using (user_id = (select auth.uid()));

create policy companies_select_member on linktree.companies
for select to authenticated
using (id in (select m.company_id from linktree.company_members m where m.user_id = (select auth.uid())));

-- Backfill: every existing user owns a company of their own. Its id reuses the user's id only to make this
-- mapping a single statement; nothing may rely on company_id = user_id.
insert into linktree.companies (id, name)
select id, left(coalesce(nullif(trim(display_name), ''), username::text, 'Công ty của tôi'), 120)
from linktree.profiles;
insert into linktree.company_members (company_id, user_id, role)
select id, id, 'owner' from linktree.profiles;

alter table linktree.pages add column company_id uuid references linktree.companies (id) on delete cascade;
update linktree.pages set company_id = owner_id;
alter table linktree.pages alter column company_id set not null;
create index pages_company_updated_idx on linktree.pages (company_id, updated_at desc);
-- The company owns the page; deleting the creator's account keeps it.
alter table linktree.pages alter column owner_id drop not null;
alter table linktree.pages drop constraint pages_owner_id_fkey;
alter table linktree.pages
  add constraint pages_owner_id_fkey foreign key (owner_id) references linktree.profiles (id) on delete set null;

-- Pages now outlive their creator, so deleting an account sets page_versions.created_by to null. Keep the
-- snapshot columns immutable and allow only that.
drop trigger page_versions_immutable on linktree.page_versions;
create trigger page_versions_immutable
before update of id, page_id, revision, schema_version, config, created_at on linktree.page_versions
for each row execute function linktree_private.forbid_update();

-- ---------- role helpers (used inside security definer RPCs only) ----------
create function linktree_private.role_rank(p_role text)
returns int
language sql
immutable
set search_path = ''
as $$
  select case p_role
    when 'viewer' then 1 when 'editor' then 2 when 'admin' then 3 when 'owner' then 4 when 'super_admin' then 5
    else 0 end;
$$;

-- The caller's company and role; raises when signed out or not in a company.
create function linktree_private.my_membership()
returns linktree.company_members
language plpgsql
stable
set search_path = ''
as $$
declare
  v_member linktree.company_members;
begin
  if (select auth.uid()) is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'PT401';
  end if;
  select * into v_member from linktree.company_members where user_id = (select auth.uid());
  if not found then
    raise exception 'NO_COMPANY' using errcode = 'PT403';
  end if;
  return v_member;
end;
$$;

-- Locks a page the caller may act on. Pages of other companies look missing (404); a role below
-- p_min_role is 403.
create function linktree_private.page_for(p_page_id uuid, p_min_role text)
returns linktree.pages
language plpgsql
set search_path = ''
as $$
declare
  v_member linktree.company_members := linktree_private.my_membership();
  v_page linktree.pages;
begin
  select * into v_page from linktree.pages where id = p_page_id and company_id = v_member.company_id for update;
  if not found then
    raise exception 'PAGE_NOT_FOUND' using errcode = 'PT404';
  end if;
  if linktree_private.role_rank(v_member.role) < linktree_private.role_rank(p_min_role) then
    raise exception 'FORBIDDEN' using errcode = 'PT403';
  end if;
  return v_page;
end;
$$;

-- ---------- RLS: company members read; writes go through the RPCs ----------
drop policy pages_select_own on linktree.pages;
drop policy pages_delete_own on linktree.pages;
revoke delete on linktree.pages from authenticated;
create policy pages_select_member on linktree.pages
for select to authenticated
using (company_id in (select m.company_id from linktree.company_members m where m.user_id = (select auth.uid())));

drop policy page_versions_select_own on linktree.page_versions;
create policy page_versions_select_member on linktree.page_versions
for select to authenticated
using (exists (
  select 1 from linktree.pages p join linktree.company_members m on m.company_id = p.company_id
  where p.id = page_id and m.user_id = (select auth.uid())
));

drop policy deployments_select_own on linktree.deployments;
create policy deployments_select_member on linktree.deployments
for select to authenticated
using (exists (
  select 1 from linktree.pages p join linktree.company_members m on m.company_id = p.company_id
  where p.id = page_id and m.user_id = (select auth.uid())
));

drop policy url_redirects_select_own on linktree.url_redirects;
create policy url_redirects_select_member on linktree.url_redirects
for select to authenticated
using (exists (
  select 1 from linktree.pages p join linktree.company_members m on m.company_id = p.company_id
  where p.id = page_id and m.user_id = (select auth.uid())
));

-- ---------- RPCs follow the role matrix ----------
create or replace function linktree.create_page(p_template_key text, p_slug text)
returns linktree.pages
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member linktree.company_members := linktree_private.my_membership();
  v_template linktree.templates;
  v_page linktree.pages;
  v_version_id uuid;
begin
  if linktree_private.role_rank(v_member.role) < linktree_private.role_rank('admin') then
    raise exception 'FORBIDDEN' using errcode = 'PT403';
  end if;
  select * into v_template from linktree.templates where key = p_template_key and is_active;
  if not found then
    raise exception 'TEMPLATE_NOT_FOUND' using errcode = 'PT404';
  end if;

  begin
    insert into linktree.pages (owner_id, company_id, template_id, slug)
    values (v_member.user_id, v_member.company_id, v_template.id, p_slug)
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
    v_template.default_config || jsonb_build_object('template', v_template.key), v_member.user_id
  )
  returning id into v_version_id;

  update linktree.pages set draft_version_id = v_version_id where id = v_page.id returning * into v_page;
  return v_page;
end;
$$;

create or replace function linktree.save_draft(p_page_id uuid, p_expected_revision bigint, p_config jsonb)
returns table (version_id uuid, revision bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_page linktree.pages := linktree_private.page_for(p_page_id, 'editor');
  v_current bigint;
  v_template_id uuid;
begin
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
  values (p_page_id, v_current + 1, 1, p_config, (select auth.uid()))
  returning id, page_versions.revision into version_id, revision;

  update linktree.pages set draft_version_id = version_id, template_id = v_template_id where id = p_page_id;
  return next;
end;
$$;

create or replace function linktree.publish_page(p_page_id uuid, p_expected_revision bigint)
returns table (revision bigint, live_version_id uuid, slug text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_page linktree.pages := linktree_private.page_for(p_page_id, 'admin');
  v_draft linktree.page_versions;
begin
  select * into v_draft from linktree.page_versions where id = v_page.draft_version_id;
  -- Never publish a newer draft than the one the admin reviewed (e.g. saved from another tab).
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
$$;

-- Replaces the client-side table delete, so the role matrix applies. Returns the deleted row (slug for caches).
create function linktree.delete_page(p_page_id uuid)
returns linktree.pages
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_page linktree.pages := linktree_private.page_for(p_page_id, 'admin');
begin
  delete from linktree.pages where id = v_page.id;
  return v_page;
end;
$$;
revoke execute on function linktree.delete_page(uuid) from public, anon;
grant execute on function linktree.delete_page(uuid) to authenticated;

create or replace function linktree.page_traffic(p_days int default 30)
returns table (page_id uuid, day date, views bigint, clicks bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    e.page_id,
    (e.occurred_at at time zone 'Asia/Ho_Chi_Minh')::date as day,
    count(*) filter (where e.event_type = 'view') as views,
    count(*) filter (where e.event_type = 'click') as clicks
  from linktree.page_events e
  join linktree.pages p on p.id = e.page_id
  join linktree.company_members m on m.company_id = p.company_id and m.user_id = (select auth.uid())
  where e.occurred_at >= (
      ((now() at time zone 'Asia/Ho_Chi_Minh')::date - (least(greatest(p_days, 1), 90) - 1))::timestamp
      at time zone 'Asia/Ho_Chi_Minh'
    )
  group by 1, 2
  order by 1, 2;
$$;

-- shortcut: sign-up creates a personal company (Staging only); Eosoft's project assigns real companies (V2-11e).
create or replace function linktree_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), 80);
  v_company uuid;
begin
  insert into linktree.profiles (id, display_name, avatar_url)
  values (
    new.id,
    v_name,
    case when new.raw_user_meta_data ->> 'avatar_url' ~ '^https?://' then new.raw_user_meta_data ->> 'avatar_url' end
  )
  on conflict (id) do nothing;
  if not exists (select 1 from linktree.company_members where user_id = new.id) then
    insert into linktree.companies (name) values (coalesce(nullif(trim(v_name), ''), 'Công ty của tôi'))
    returning id into v_company;
    insert into linktree.company_members (company_id, user_id, role) values (v_company, new.id, 'owner');
  end if;
  return new;
end;
$$;
