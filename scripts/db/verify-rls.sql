-- Row-Level Security verification queries. Run as a role with enough
-- privilege to `set role` (the service role, or a superuser via the
-- Supabase SQL editor / MCP tools) — never run application-side.
--
-- Every "anon"/"authenticated (no JWT)" count below must be 0. A non-zero
-- count means an unauthenticated or unidentified caller can read data they
-- should not be able to, and the matching RLS policy needs to be fixed
-- before deploying.
--
-- Last run against the live project on 2026-09-04: all counts were 0.

set role anon;
select count(*) as anon_sees_orders from orders;
select count(*) as anon_sees_scenario_findings from scenario_findings;
select count(*) as anon_sees_legal_provisions from legal_provisions;
select count(*) as anon_sees_app_allowed_emails from app_allowed_emails;
reset role;

-- "authenticated" without a JWT email claim simulates a signed-in Supabase
-- Auth user whose email is not (or not yet) in app_allowed_emails, or any
-- other caller that reached the "authenticated" role without a valid
-- session context is_allowed_user() can resolve an email from.
set role authenticated;
select count(*) as authenticated_no_jwt_sees_orders from orders;
select count(*) as authenticated_no_jwt_sees_scenario_findings from scenario_findings;
reset role;
