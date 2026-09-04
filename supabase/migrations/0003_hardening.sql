-- Security-linter hardening: pin function search_path, move pg_trgm out of
-- the public schema. (is_allowed_user() remains callable by anon/authenticated
-- by design — RLS policy evaluation runs as the querying role and must be
-- able to invoke it; it only ever returns a boolean and never exposes the
-- allowlist contents, so this is an accepted, intentional exception.)

create schema if not exists extensions;
alter extension pg_trgm set schema extensions;

create or replace function set_updated_at() returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
