-- DB-06 cross-tenant tests. Everything runs in one transaction and is rolled back.
-- Run against a database with all migrations applied (local Supabase):
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_test.sql
-- Prints "rls_test: all passed" on success; any failed assertion aborts with an error.

\set ON_ERROR_STOP 1
\set user_a '00000000-0000-4000-8000-00000000000a'
\set user_b '00000000-0000-4000-8000-00000000000b'
\set user_c '00000000-0000-4000-8000-00000000000c'

begin;

create schema tests;
grant usage on schema tests to anon, authenticated, service_role;

create function tests.ok(passed boolean, label text) returns void language plpgsql as $$
begin
  if passed is not true then raise exception 'FAILED: %', label; end if;
end $$;

-- Runs sql as the current role and expects it to fail with the given SQLSTATE.
create function tests.throws(sql text, code text, label text) returns void language plpgsql as $$
begin
  execute sql;
  raise exception 'FAILED (no error): %', label;
exception when others then
  if sqlstate like 'FAILED%' or sqlerrm like 'FAILED (no error)%' then raise; end if;
  if sqlstate <> code then raise exception 'FAILED: % (got % %, want %)', label, sqlstate, sqlerrm, code; end if;
end $$;
grant execute on all functions in schema tests to anon, authenticated, service_role;

-- ---------- setup (superuser) ----------
insert into auth.users (id, raw_user_meta_data) values
  (:'user_a', '{"full_name": "Son"}'),
  (:'user_b', '{}'),
  (:'user_c', '{}');

select tests.ok((select display_name from linktree.profiles where id = :'user_a') = 'Son', 'signup trigger creates profile');
select tests.ok((select count(*) from linktree.profiles where id in (:'user_a', :'user_b', :'user_c')) = 3, 'one profile per user');

-- ---------- profiles ----------
select set_config('request.jwt.claims', json_build_object('sub', :'user_a', 'role', 'authenticated')::text, true);
set local role authenticated;
select tests.throws($$update linktree.profiles set username = 'Son' where id = auth.uid()$$, '23514', 'uppercase username rejected');
select tests.throws($$update linktree.profiles set username = 'login' where id = auth.uid()$$, '23514', 'reserved username rejected');
update linktree.profiles set username = 'son' where id = auth.uid();
select tests.throws($$update linktree.profiles set username = 'son2' where id = auth.uid()$$, 'PT409', 'username locked once set');
update linktree.profiles set display_name = 'hacked' where id = :'user_b';
reset role;
select tests.ok((select display_name from linktree.profiles where id = :'user_b') is null, 'cannot update another profile');

select set_config('request.jwt.claims', json_build_object('sub', :'user_b', 'role', 'authenticated')::text, true);
set local role authenticated;
select tests.throws($$update linktree.profiles set username = 'son' where id = auth.uid()$$, '23505', 'username unique (case-insensitive)');
update linktree.profiles set username = 'tien' where id = auth.uid();
reset role;

-- ---------- pages: same slug for two owners ----------
select set_config('request.jwt.claims', json_build_object('sub', :'user_a', 'role', 'authenticated')::text, true);
set local role authenticated;
select (linktree.create_page('classic', 'tech-review')).id as page_a \gset
select tests.throws($$select linktree.create_page('classic', 'tech-review')$$, 'PT409', 'duplicate slug for same owner');
select tests.throws($$select linktree.create_page('classic', 'Bad Slug')$$, 'PT400', 'invalid slug');
select tests.throws($$select linktree.create_page('nope', 'x')$$, 'PT404', 'unknown template');
reset role;

select set_config('request.jwt.claims', json_build_object('sub', :'user_b', 'role', 'authenticated')::text, true);
set local role authenticated;
select (linktree.create_page('classic', 'tech-review')).id as page_b \gset
select tests.ok(:'page_a' <> :'page_b', 'same slug, different owners, distinct pages');
reset role;

select set_config('request.jwt.claims', json_build_object('sub', :'user_c', 'role', 'authenticated')::text, true);
set local role authenticated;
select tests.throws($$select linktree.create_page('classic', 'x')$$, 'PT403', 'username required before creating pages');
reset role;

-- ---------- cross-tenant reads and writes (as A) ----------
select set_config('request.jwt.claims', json_build_object('sub', :'user_a', 'role', 'authenticated')::text, true);
set local role authenticated;
select tests.ok((select count(*) from linktree.pages) = 1, 'A sees only own pages');
select tests.ok((select count(*) from linktree.page_versions where page_id = :'page_b') = 0, 'A cannot read B versions');
select tests.throws(format($$select linktree.save_draft(%L, 1, '{"schemaVersion":1,"template":"classic"}')$$, :'page_b'), 'PT404', 'A cannot save B draft');
delete from linktree.pages where id = :'page_b';
select tests.throws(format($$update linktree.pages set live_version_id = draft_version_id where id = %L$$, :'page_a'), '42501', 'client cannot set live version');
select tests.throws(format($$update linktree.pages set status = 'published' where id = %L$$, :'page_a'), '42501', 'client cannot set status');
select tests.throws(format($$insert into linktree.page_versions (page_id, revision, schema_version, config) values (%L, 9, 1, '{"schemaVersion":1}')$$, :'page_a'), '42501', 'client cannot insert versions directly');

-- save_draft: revision precondition
select tests.ok((select revision from linktree.save_draft(:'page_a', 1, '{"schemaVersion":1,"template":"shop-grid","profile":{"title":"A"}}')) = 2, 'save_draft bumps revision');
select tests.throws(format($$select linktree.save_draft(%L, 1, '{"schemaVersion":1,"template":"classic"}')$$, :'page_a'), 'PT409', 'stale revision rejected');
select tests.throws(format($$select linktree.save_draft(%L, 2, '{"schemaVersion":2,"template":"classic"}')$$, :'page_a'), 'PT400', 'wrong schemaVersion rejected');
select tests.ok((select t.key from linktree.pages p join linktree.templates t on t.id = p.template_id where p.id = :'page_a') = 'shop-grid', 'template follows saved config');

-- rename_page (FE-07)
select tests.throws(format($$select linktree.rename_page(%L, 'x')$$, :'page_b'), 'PT404', 'A cannot rename B page');
select tests.throws(format($$select linktree.rename_page(%L, 'Bad Slug')$$, :'page_a'), 'PT400', 'rename rejects invalid slug');
select (linktree.create_page('classic', 'other')).id as page_other \gset
select tests.throws(format($$select linktree.rename_page(%L, 'other')$$, :'page_a'), 'PT409', 'rename rejects own taken slug');
select tests.ok((linktree.rename_page(:'page_a', 'tech-2')).slug = 'tech-2', 'rename updates slug');
select tests.ok((select count(*) from linktree.url_redirects) = 0, 'unpublished rename adds no redirect');
select tests.throws($$insert into linktree.url_redirects (page_id, old_path, new_path) values (gen_random_uuid(), '/son/a', '/son/b')$$, '42501', 'client cannot write redirects');
reset role;
update linktree.pages set live_version_id = draft_version_id where id = :'page_a';
set local role authenticated;
select (linktree.rename_page(:'page_a', 'tech-3')).id is not null as renamed \gset
select tests.ok((select new_path from linktree.url_redirects where old_path = '/son/tech-2') = '/son/tech-3', 'published rename redirects old path');
select (linktree.rename_page(:'page_a', 'tech-2')).id is not null as renamed \gset
select tests.ok((select count(*) from linktree.url_redirects where old_path = '/son/tech-2') = 0, 'reused path stops redirecting');
select tests.ok((select new_path from linktree.url_redirects where old_path = '/son/tech-3') = '/son/tech-2', 'previous path redirects to current');

-- publish_page / get_published_page (PUB-01, PUB-02)
select tests.throws(format($$select * from linktree.publish_page(%L, 1)$$, :'page_b'), 'PT404', 'A cannot publish B page');
select tests.throws(format($$select * from linktree.publish_page(%L, 1)$$, :'page_a'), 'PT409', 'publish rejects a stale revision');
select tests.ok((select revision from linktree.publish_page(:'page_a', 2)) = 2, 'publish current revision');
select tests.ok((select revision from linktree.publish_page(:'page_a', 2)) = 2, 'publish is idempotent');
select tests.ok((select revision from linktree.save_draft(:'page_a', 2, '{"schemaVersion":1,"template":"classic","profile":{"title":"Unpublished edit"}}')) = 3, 'save after publish');
reset role;
set local role anon;
select tests.ok((select config->'profile'->>'title' from linktree.get_published_page('son', 'tech-2')) = 'A', 'anon reads the live version, not the newer draft');
select tests.ok((select redirect_to from linktree.get_published_page('son', 'tech-3')) = '/son/tech-2', 'anon gets redirect for old path');
select tests.ok((select count(*) from linktree.get_published_page('tien', 'tech-review')) = 0, 'unpublished page is not readable');
select tests.ok((select count(*) from linktree.get_published_page('son', 'other')) = 0, 'never-published page is not readable');
select tests.throws(format($$select * from linktree.publish_page(%L, 3)$$, :'page_a'), '42501', 'anon cannot publish');

-- record_page_event / page_traffic (AN-01, AN-02)
select tests.throws($$select linktree.record_page_event('son', 'tech-2', 'view')$$, '42501', 'anon cannot record events directly');
select tests.throws($$select * from linktree.page_traffic(30)$$, '42501', 'anon cannot read traffic');
reset role;
set local role service_role;
select tests.ok(linktree.record_page_event('son', 'tech-2', 'view'), 'server records a view on a live page');
select tests.ok(linktree.record_page_event('son', 'tech-2', 'click', 'b-link-1', 'facebook.com', 'fb'), 'server records a click');
select tests.ok(not linktree.record_page_event('son', 'other', 'view'), 'unpublished page gets no events');
select tests.throws($$select linktree.record_page_event('son', 'tech-2', 'purchase')$$, '23514', 'unknown event type rejected');
reset role;
set local role authenticated;
select tests.throws($$select linktree.record_page_event('son', 'tech-2', 'view')$$, '42501', 'signed-in users cannot record events directly');
select tests.ok((select views = 1 and clicks = 1 from linktree.page_traffic(30) where page_id = :'page_a'), 'owner sees own daily views and clicks');
select set_config('request.jwt.claims', json_build_object('sub', :'user_b', 'role', 'authenticated')::text, true);
select tests.ok((select count(*) from linktree.page_traffic(30)) = 0, 'B cannot see A traffic');
select set_config('request.jwt.claims', json_build_object('sub', :'user_a', 'role', 'authenticated')::text, true);
reset role;
select tests.ok((select count(*) from linktree.pages where id = :'page_b') = 1, 'B page survived A delete');

-- ---------- invariants (superuser) ----------
select tests.throws(format($$update linktree.page_versions set config = '{}' where page_id = %L$$, :'page_a'), 'PT409', 'versions are immutable');
select tests.throws(
  format($$update linktree.pages set draft_version_id = (select id from linktree.page_versions where page_id = %L limit 1) where id = %L$$, :'page_b', :'page_a'),
  '23503', 'pointer cannot reference another page''s version');

-- ---------- products and media (as A) ----------
insert into linktree.products (owner_id, title, destination_url) values (:'user_b', 'B product', 'https://b.example') returning id as product_b \gset
select set_config('request.jwt.claims', json_build_object('sub', :'user_a', 'role', 'authenticated')::text, true);
set local role authenticated;
select tests.throws(format($$insert into linktree.products (owner_id, title, destination_url) values (%L, 'x', 'https://x.example')$$, :'user_b'), '42501', 'cannot create product for B');
select tests.throws(format($$insert into linktree.products (owner_id, title, destination_url) values (%L, 'x', 'javascript:alert(1)')$$, :'user_a'), '23514', 'unsafe product URL rejected');
insert into linktree.products (owner_id, title, destination_url) values (:'user_a', 'A product', 'https://a.example') returning id as product_a \gset
select tests.ok((select count(*) from linktree.products) = 1, 'A sees only own products');
insert into linktree.page_products (page_id, product_id) values (:'page_a', :'product_a');
select tests.throws(format($$insert into linktree.page_products (page_id, product_id) values (%L, %L)$$, :'page_b', :'product_a'), 'PT403', 'cannot attach to B page');  -- owner trigger fires before RLS check
select tests.throws(format($$insert into linktree.page_products (page_id, product_id) values (%L, %L)$$, :'page_a', :'product_b'), 'PT403', 'cannot attach B product');
select tests.throws(format($$insert into linktree.media_assets (owner_id, storage_path, mime_type, bytes) values (%L, %L, 'image/png', 10)$$, :'user_a', :'user_b' || '/x.png'), '23514', 'media path must be under own folder');
insert into linktree.media_assets (owner_id, storage_path, mime_type, bytes) values (:'user_a', :'user_a' || '/x.png', 'image/png', 10);
select tests.throws(format($$insert into storage.objects (bucket_id, name) values ('media', %L)$$, :'user_b' || '/x.png'), '42501', 'storage: cannot upload into B folder');
insert into storage.objects (bucket_id, name) values ('media', :'user_a' || '/x.png');

-- server-only tables
select tests.throws(format($$insert into linktree.page_events (page_id, event_type) values (%L, 'view')$$, :'page_a'), '42501', 'client cannot write events');
select tests.throws($$select count(*) from linktree.page_events$$, '42501', 'client cannot read raw events');
select tests.throws(format($$insert into linktree.deployments (page_id) values (%L)$$, :'page_a'), '42501', 'client cannot write deployments');
reset role;

-- ---------- anonymous ----------
set local role anon;
select tests.ok((select count(*) from linktree.templates) = 3, 'anon reads active templates');
select tests.ok((select count(*) from linktree.profiles where id in (:'user_a', :'user_b', :'user_c')) = 2, 'anon sees only claimed profiles');
select tests.throws($$select count(*) from linktree.pages$$, '42501', 'anon cannot read pages');
select tests.throws($$select count(*) from linktree.page_versions$$, '42501', 'anon cannot read drafts');
select tests.throws($$select linktree.create_page('classic', 'x')$$, '42501', 'anon cannot call create_page');
select tests.throws($$select linktree.rename_page(gen_random_uuid(), 'x')$$, '42501', 'anon cannot call rename_page');
reset role;

-- ---------- cascade ----------
select set_config('request.jwt.claims', json_build_object('sub', :'user_a', 'role', 'authenticated')::text, true);
set local role authenticated;
delete from linktree.pages where id = :'page_a';
select tests.ok((select count(*) from linktree.page_versions where page_id = :'page_a') = 0, 'owner delete cascades versions');
reset role;

-- ---------- V2-10b: nothing of ours in Eosoft's namespaces ----------
select tests.ok(not exists (
  select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname in ('profiles', 'templates', 'pages', 'page_versions', 'media_assets',
    'products', 'page_products', 'deployments', 'url_redirects', 'page_events')
), 'no LinkBio tables left in public');
select tests.ok(not exists (
  select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname in ('create_page', 'save_draft', 'publish_page', 'rename_page',
    'get_published_page', 'record_page_event', 'page_traffic')
), 'no LinkBio functions left in public');
select tests.ok(not exists (select 1 from pg_namespace where nspname = 'private'), 'schema private removed');
select tests.ok(exists (
  select 1 from pg_trigger where tgname = 'linktree_on_auth_user_created' and tgrelid = 'auth.users'::regclass
) and not exists (select 1 from pg_trigger where tgname = 'on_auth_user_created'), 'sign-up trigger renamed');
select tests.ok(not has_schema_privilege('anon', 'linktree_private', 'usage')
  and not has_schema_privilege('authenticated', 'linktree_private', 'usage'), 'linktree_private not reachable by clients');

select 'rls_test: all passed' as result;
rollback;
