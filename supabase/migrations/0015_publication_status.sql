-- Publication/quarantine lifecycle for scenario_findings (spec §23).
-- Controls whether a finding is surfaced by the Scenario Analyzer's
-- matching engine, independent of finding_status (which records the
-- underlying allegation's own procedural outcome) and the verification
-- flags (which record whether the finding's data was checked against the
-- source order). All existing rows default to published_to_search,
-- reflecting their current live status only — not a claim that they have
-- been freshly re-reviewed under this new lifecycle.
create type publication_status_type as enum (
  'draft',
  'quarantined',
  'published_to_search',
  'published_with_warning',
  'withdrawn'
);

alter table scenario_findings
  add column publication_status publication_status_type not null default 'published_to_search';

comment on column scenario_findings.publication_status is
  'Publication/quarantine lifecycle state controlling whether this finding is surfaced by the Scenario Analyzer matching engine. Draft, Quarantined and Withdrawn are excluded from matching entirely; Published with warning is included but must be shown with a visible caution; Published to search is the ordinary state. Existing rows default to published_to_search, reflecting their current live status, not a claim that they have been freshly re-reviewed.';
