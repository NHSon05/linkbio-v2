-- DB-01: profiles, one per auth user. Username is chosen later (ON-01), so it starts null.
create extension if not exists citext with schema extensions;
create schema if not exists private;
revoke all on schema private from public;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username extensions.citext unique,
  display_name text check (char_length(display_name) <= 80),
  avatar_url text check (avatar_url ~ '^https?://'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Cast to text: regex on citext is case-insensitive, URLs must be lowercase.
  constraint profiles_username_format check (username::text ~ '^[a-z0-9][a-z0-9-]{2,29}$'),
  -- Top-level routes and system names (keep in sync with src/app).
  constraint profiles_username_reserved check (
    username::text not in (
      'admin', 'api', 'auth', 'dashboard', 'forgot-password', 'help', 'login', 'logout',
      'onboarding', 'register', 'settings', 'signup', 'static', 'support', 'templates', 'www'
    )
  )
);
alter table public.profiles enable row level security;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

-- Username is part of every public URL; once claimed it cannot change here (renames need redirects).
create or replace function private.lock_username()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.username is not null and new.username is distinct from old.username then
    raise exception 'username cannot be changed' using errcode = 'PT409';
  end if;
  return new;
end;
$$;

create trigger profiles_lock_username
before update of username on public.profiles
for each row execute function private.lock_username();

-- Create the profile when Supabase Auth creates a user (email or Google).
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), 80),
    case when new.raw_user_meta_data ->> 'avatar_url' ~ '^https?://' then new.raw_user_meta_data ->> 'avatar_url' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke execute on function private.handle_new_user() from public;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

-- Users who signed up before this migration.
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;
