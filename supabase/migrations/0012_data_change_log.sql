-- Audit trail for curated-data corrections (conduct-tag fixes, transaction-
-- type fixes, etc.) made directly against the database rather than through
-- the app's own UI. Several rounds of correction this session (SSSL-02 and
-- 8 further mistagged findings; the fictitious_sales_or_assets split across
-- 27 findings) were applied via raw SQL with no record of what changed,
-- when, or why beyond the git commit messages describing the code change
-- that motivated them. This table makes that traceable inside the app
-- itself, for both officers reviewing the data and future correction work.
create table data_change_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_ref text not null, -- e.g. scenario_findings.record_id
  field_name text not null,
  old_value text,
  new_value text,
  reason text not null,
  changed_by text not null,
  changed_at timestamptz not null default now()
);

alter table data_change_log enable row level security;

create policy data_change_log_select_allowed_user
on data_change_log
for select
to public
using (is_allowed_user());
