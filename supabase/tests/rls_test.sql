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
grant usage on schema tests to anon, authenticated;

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
grant execute on all functions in schema tests to anon, authenticated;

-- ---------- setup (superuser) ----------
insert into auth.users (id, raw_user_meta_data) values
  (:'user_a', '{"full_name": "Son"}'),
  (:'user_b', '{}'),
  (:'user_c', '{}');

select tests.ok((select display_name from public.profiles where id = :'user_a') = 'Son', 'signup trigger creates profile');
select tests.ok((select count(*) from public.profiles where id in (:'user_a', :'user_b', :'user_c')) = 3, 'one profile per user');

-- ---------- profiles ----------
select set_config('request.jwt.claims', json_build_object('sub', :'user_a', 'role', 'authenticated')::text, true);
set local role authenticated;
select tests.throws($$update public.profiles set username = 'Son' where id = auth.uid()$$, '23514', 'uppercase username rejected');
select tests.throws($$update public.profiles set username = 'login' where id = auth.uid()$$, '23514', 'reserved username rejected');
update public.profiles set username = 'son' where id = auth.uid();
select tests.throws($$update public.profiles set username = 'son2' where id = auth.uid()$$, 'PT409', 'username locked once set');
update public.profiles set display_name = 'hacked' where id = :'user_b';
reset role;
select tests.ok((select display_name from public.profiles where id = :'user_b') is null, 'cannot update another profile');

select set_config('request.jwt.claims', json_build_object('sub', :'user_b', 'role', 'authenticated')::text, true);
set local role authenticated;
select tests.throws($$update public.profiles set username = 'son' where id = auth.uid()$$, '23505', 'username unique (case-insensitive)');
update public.profiles set username = 'tien' where id = auth.uid();
reset role;

-- ---------- pages: same slug for two owners ----------
select set_config('request.jwt.claims', json_build_object('sub', :'user_a', 'role', 'authenticated')::text, true);
set local role authenticated;
select (public.create_page('classic', 'tech-review')).id as page_a \gset
select tests.throws($$select public.create_page('classic', 'tech-review')$$, 'PT409', 'duplicate slug for same owner');
select tests.throws($$select public.create_page('classic', 'Bad Slug')$$, 'PT400', 'invalid slug');
select tests.throws($$select public.create_page('nope', 'x')$$, 'PT404', 'unknown template');
reset role;

select set_config('request.jwt.claims', json_build_object('sub', :'user_b', 'role', 'authenticated')::text, true);
set local role authenticated;
select (public.create_page('classic', 'tech-review')).id as page_b \gset
select tests.ok(:'page_a' <> :'page_b', 'same slug, different owners, distinct pages');
reset role;

select set_config('request.jwt.claims', json_build_object('sub', :'user_c', 'role', 'authenticated')::text, true);
set local role authenticated;
select tests.throws($$select public.create_page('classic', 'x')$$, 'PT403', 'username required before creating pages');
reset role;

-- ---------- cross-tenant reads and writes (as A) ----------
select set_config('request.jwt.claims', json_build_object('sub', :'user_a', 'role', 'authenticated')::text, true);
set local role authenticated;
select tests.ok((select count(*) from public.pages) = 1, 'A sees only own pages');
select tests.ok((select count(*) from public.page_versions where page_id = :'page_b') = 0, 'A cannot read B versions');
select tests.throws(format($$select public.save_draft(%L, 1, '{"schemaVersion":1,"template":"classic"}')$$, :'page_b'), 'PT404', 'A cannot save B draft');
delete from public.pages where id = :'page_b';
select tests.throws(format($$update public.pages set live_version_id = draft_version_id where id = %L$$, :'page_a'), '42501', 'client cannot set live version');
select tests.throws(format($$update public.pages set status = 'published' where id = %L$$, :'page_a'), '42501', 'client cannot set status');
select tests.throws(format($$insert into public.page_versions (page_id, revision, schema_version, config) values (%L, 9, 1, '{"schemaVersion":1}')$$, :'page_a'), '42501', 'client cannot insert versions directly');

-- save_draft: revision precondition
select tests.ok((select revision from public.save_draft(:'page_a', 1, '{"schemaVersion":1,"template":"shop-grid","profile":{"title":"A"}}')) = 2, 'save_draft bumps revision');
select tests.throws(format($$select public.save_draft(%L, 1, '{"schemaVersion":1,"template":"classic"}')$$, :'page_a'), 'PT409', 'stale revision rejected');
select tests.throws(format($$select public.save_draft(%L, 2, '{"schemaVersion":2,"template":"classic"}')$$, :'page_a'), 'PT400', 'wrong schemaVersion rejected');
select tests.ok((select t.key from public.pages p join public.templates t on t.id = p.template_id where p.id = :'page_a') = 'shop-grid', 'template follows saved config');

-- rename_page (FE-07)
select tests.throws(format($$select public.rename_page(%L, 'x')$$, :'page_b'), 'PT404', 'A cannot rename B page');
select tests.throws(format($$select public.rename_page(%L, 'Bad Slug')$$, :'page_a'), 'PT400', 'rename rejects invalid slug');
select (public.create_page('classic', 'other')).id as page_other \gset
select tests.throws(format($$select public.rename_page(%L, 'other')$$, :'page_a'), 'PT409', 'rename rejects own taken slug');
select tests.ok((public.rename_page(:'page_a', 'tech-2')).slug = 'tech-2', 'rename updates slug');
select tests.ok((select count(*) from public.url_redirects) = 0, 'unpublished rename adds no redirect');
select tests.throws($$insert into public.url_redirects (page_id, old_path, new_path) values (gen_random_uuid(), '/son/a', '/son/b')$$, '42501', 'client cannot write redirects');
reset role;
update public.pages set live_version_id = draft_version_id where id = :'page_a';
set local role authenticated;
select (public.rename_page(:'page_a', 'tech-3')).id is not null as renamed \gset
select tests.ok((select new_path from public.url_redirects where old_path = '/son/tech-2') = '/son/tech-3', 'published rename redirects old path');
select (public.rename_page(:'page_a', 'tech-2')).id is not null as renamed \gset
select tests.ok((select count(*) from public.url_redirects where old_path = '/son/tech-2') = 0, 'reused path stops redirecting');
select tests.ok((select new_path from public.url_redirects where old_path = '/son/tech-3') = '/son/tech-2', 'previous path redirects to current');
reset role;
select tests.ok((select count(*) from public.pages where id = :'page_b') = 1, 'B page survived A delete');

-- ---------- invariants (superuser) ----------
select tests.throws(format($$update public.page_versions set config = '{}' where page_id = %L$$, :'page_a'), 'PT409', 'versions are immutable');
select tests.throws(
  format($$update public.pages set draft_version_id = (select id from public.page_versions where page_id = %L limit 1) where id = %L$$, :'page_b', :'page_a'),
  '23503', 'pointer cannot reference another page''s version');

-- ---------- products and media (as A) ----------
insert into public.products (owner_id, title, destination_url) values (:'user_b', 'B product', 'https://b.example') returning id as product_b \gset
select set_config('request.jwt.claims', json_build_object('sub', :'user_a', 'role', 'authenticated')::text, true);
set local role authenticated;
select tests.throws(format($$insert into public.products (owner_id, title, destination_url) values (%L, 'x', 'https://x.example')$$, :'user_b'), '42501', 'cannot create product for B');
select tests.throws(format($$insert into public.products (owner_id, title, destination_url) values (%L, 'x', 'javascript:alert(1)')$$, :'user_a'), '23514', 'unsafe product URL rejected');
insert into public.products (owner_id, title, destination_url) values (:'user_a', 'A product', 'https://a.example') returning id as product_a \gset
select tests.ok((select count(*) from public.products) = 1, 'A sees only own products');
insert into public.page_products (page_id, product_id) values (:'page_a', :'product_a');
select tests.throws(format($$insert into public.page_products (page_id, product_id) values (%L, %L)$$, :'page_b', :'product_a'), 'PT403', 'cannot attach to B page');  -- owner trigger fires before RLS check
select tests.throws(format($$insert into public.page_products (page_id, product_id) values (%L, %L)$$, :'page_a', :'product_b'), 'PT403', 'cannot attach B product');
select tests.throws(format($$insert into public.media_assets (owner_id, storage_path, mime_type, bytes) values (%L, %L, 'image/png', 10)$$, :'user_a', :'user_b' || '/x.png'), '23514', 'media path must be under own folder');
insert into public.media_assets (owner_id, storage_path, mime_type, bytes) values (:'user_a', :'user_a' || '/x.png', 'image/png', 10);
select tests.throws(format($$insert into storage.objects (bucket_id, name) values ('media', %L)$$, :'user_b' || '/x.png'), '42501', 'storage: cannot upload into B folder');
insert into storage.objects (bucket_id, name) values ('media', :'user_a' || '/x.png');

-- server-only tables
select tests.throws(format($$insert into public.page_events (page_id, event_type) values (%L, 'view')$$, :'page_a'), '42501', 'client cannot write events');
select tests.throws($$select count(*) from public.page_events$$, '42501', 'client cannot read raw events');
select tests.throws(format($$insert into public.deployments (page_id) values (%L)$$, :'page_a'), '42501', 'client cannot write deployments');
reset role;

-- ---------- anonymous ----------
set local role anon;
select tests.ok((select count(*) from public.templates) = 3, 'anon reads active templates');
select tests.ok((select count(*) from public.profiles where id in (:'user_a', :'user_b', :'user_c')) = 2, 'anon sees only claimed profiles');
select tests.throws($$select count(*) from public.pages$$, '42501', 'anon cannot read pages');
select tests.throws($$select count(*) from public.page_versions$$, '42501', 'anon cannot read drafts');
select tests.throws($$select public.create_page('classic', 'x')$$, '42501', 'anon cannot call create_page');
select tests.throws($$select public.rename_page(gen_random_uuid(), 'x')$$, '42501', 'anon cannot call rename_page');
reset role;

-- ---------- cascade ----------
select set_config('request.jwt.claims', json_build_object('sub', :'user_a', 'role', 'authenticated')::text, true);
set local role authenticated;
delete from public.pages where id = :'page_a';
select tests.ok((select count(*) from public.page_versions where page_id = :'page_a') = 0, 'owner delete cascades versions');
reset role;

select 'rls_test: all passed' as result;
rollback;
