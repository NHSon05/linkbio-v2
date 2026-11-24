-- DB-05: deployments, URL redirects and analytics events. Written only by the trusted server.

create table public.deployments (
  id uuid primary key default gen_random_uuid(),
  -- Null for a global build that is not tied to one page.
  page_id uuid references public.pages (id) on delete cascade,
  requested_version_id uuid references public.page_versions (id) on delete set null,
  provider_deployment_id text,
  status text not null default 'queued' check (status in ('queued', 'building', 'ready', 'failed', 'superseded')),
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint deployments_completed_when_done check ((status in ('ready', 'failed', 'superseded')) = (completed_at is not null))
);
alter table public.deployments enable row level security;
create index deployments_status_created_idx on public.deployments (status, created_at);
create index deployments_page_created_idx on public.deployments (page_id, created_at desc);
create index deployments_requested_version_idx on public.deployments (requested_version_id);
create unique index deployments_provider_id_key on public.deployments (provider_deployment_id)
  where provider_deployment_id is not null;

create table public.url_redirects (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages (id) on delete cascade,
  old_path text not null unique check (old_path ~ '^/[a-z0-9][a-z0-9-]*/[a-z0-9][a-z0-9-]*$'),
  new_path text not null check (new_path ~ '^/[a-z0-9][a-z0-9-]*/[a-z0-9][a-z0-9-]*$'),
  created_at timestamptz not null default now(),
  constraint url_redirects_no_self_loop check (old_path <> new_path)
);
alter table public.url_redirects enable row level security;
create index url_redirects_page_idx on public.url_redirects (page_id);

create table public.page_events (
  id bigint generated always as identity primary key,
  page_id uuid not null references public.pages (id) on delete cascade,
  event_type text not null check (event_type in ('view', 'click')),
  block_id text check (char_length(block_id) <= 100),
  referrer_host text check (char_length(referrer_host) <= 255),
  utm_source text check (char_length(utm_source) <= 100),
  occurred_at timestamptz not null default now()
);
alter table public.page_events enable row level security;
create index page_events_page_occurred_idx on public.page_events (page_id, occurred_at desc);
