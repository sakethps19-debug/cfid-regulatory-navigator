-- Row-Level Security: one authorised officer, enforced at the database
-- layer, not just the application layer. No anonymous access to any
-- application table. Writes are never performed by the anon/authenticated
-- roles — only by the service role, used exclusively in server-side import
-- scripts and API routes (never shipped to the browser).

-- app_allowed_emails is itself locked to service_role only, so the allowlist
-- can never be read via the public API even by an authenticated user.
create table app_allowed_emails (
  email text primary key
);
alter table app_allowed_emails enable row level security;
-- No policies for anon/authenticated: only the service role (which bypasses
-- RLS entirely) can read or write this table.

create or replace function is_allowed_user() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (auth.jwt() ->> 'email') is not null
    and exists (
      select 1 from app_allowed_emails
      where lower(email) = lower(auth.jwt() ->> 'email')
    ),
    false
  );
$$;

-- Enable RLS on every application table and grant SELECT only to an
-- authenticated, allow-listed user. No INSERT/UPDATE/DELETE policies are
-- defined for anon/authenticated on any table — all writes go through the
-- service role from server-side scripts.
do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'orders', 'order_relationships', 'noticees', 'order_noticees',
      'scenario_findings', 'legal_instruments', 'legal_provisions',
      'provision_versions', 'finding_provisions', 'legal_tests',
      'source_documents', 'processing_runs', 'validation_issues',
      'residual_register', 'query_runs'
    ])
  loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy %I_select_allowed_user on %I for select using (is_allowed_user())',
      t, t
    );
  end loop;
end $$;
